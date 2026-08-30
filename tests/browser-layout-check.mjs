import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const devtools = process.env.OIMS_DEVTOOLS ?? "http://127.0.0.1:9222";
const appUrl = process.env.OIMS_URL ?? "http://localhost:3000";

class DevtoolsPage {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") {
        this.errors.push(message.params.exceptionDetails.text);
      }
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }

  static async create(url) {
    const target = await (
      await fetch(`${devtools}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
    ).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    const page = new DevtoolsPage(socket);
    await page.command("Page.enable");
    await page.command("Runtime.enable");
    return page;
  }

  command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return response.result.value;
  }

  async screenshot(path) {
    const result = await this.command("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(path, Buffer.from(result.data, "base64"));
  }

  close() {
    this.socket.close();
  }
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function inspectViewport(name, width, height, mobile) {
  const page = await DevtoolsPage.create(appUrl);
  await page.command("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
  });
  await page.command("Page.navigate", { url: appUrl });
  await wait(3500);

  const base = await page.evaluate(`(() => {
    const workspace = document.querySelector('.workspace');
    const sidebar = document.querySelector('.app-side');
    const shell = document.querySelector('.app-shell');
    const main = document.querySelector('.app-main');
    if (!workspace || !sidebar || !shell || !main) return { missingShell: true };
    const before = workspace.scrollTop;
    workspace.scrollTop = workspace.scrollHeight;
    const after = workspace.scrollTop;
    const sidebarRect = sidebar.getBoundingClientRect();
    return {
      title: document.title,
      textLength: document.body.innerText.trim().length,
      errorOverlay: !!document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'),
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      workspaceOverflowY: getComputedStyle(workspace).overflowY,
      shellHeight: shell.clientHeight,
      mainHeight: main.clientHeight,
      viewportHeight: innerHeight,
      workspaceClientHeight: workspace.clientHeight,
      workspaceScrollHeight: workspace.scrollHeight,
      scrollBefore: before,
      scrollAfter: after,
      canScroll: after > before,
      reachedBottom: after + workspace.clientHeight >= workspace.scrollHeight - 2,
      bodyHasOwnScroll: document.body.scrollHeight > document.body.clientHeight,
      documentHasOwnScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      pageHasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sidebarTop: Math.round(sidebarRect.top),
      sidebarBottom: Math.round(sidebarRect.bottom),
      sidebarPosition: getComputedStyle(sidebar).position,
    };
  })()`);

  assert.equal(base.missingShell, undefined, `${name}: shell elements must render`);
  assert.equal(base.errorOverlay, false, `${name}: no framework error overlay`);
  assert.ok(base.textLength > 0, `${name}: page must not be blank`);
  assert.equal(base.workspaceOverflowY, "auto", `${name}: workspace owns vertical scroll`);
  assert.equal(base.bodyHasOwnScroll, false, `${name}: body must not create a second scrollbar`);
  assert.equal(base.documentHasOwnScroll, false, `${name}: document must not create a second scrollbar`);
  assert.equal(base.pageHasHorizontalOverflow, false, `${name}: wide tables must not widen the page`);
  assert.equal(base.sidebarPosition, "fixed", `${name}: sidebar remains fixed`);
  assert.equal(base.sidebarTop, 0, `${name}: sidebar begins at viewport top`);
  assert.equal(base.sidebarBottom, height, `${name}: sidebar fills viewport`);
  assert.equal(base.reachedBottom, true, `${name}: workspace reaches its last element`);

  const detailDrawer = await page.evaluate(`(async () => {
    const workspace = document.querySelector('.workspace');
    const trigger = document.querySelector('.stock-outlook-kpis [role="button"]');
    trigger?.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    const backdrop = document.querySelector('.owner-drawer-backdrop');
    const drawer = backdrop?.querySelector('.owner-drawer');
    const header = drawer?.querySelector(':scope > header');
    const horizontalWrap = drawer?.querySelector('.summary-detail-table-wrap, .operational-variant-matrix-wrap');
    if (!backdrop || !drawer || !header) return {
      missing: true,
      triggerFound: !!trigger,
      backdropFound: !!backdrop,
      drawerFound: !!drawer,
      headerFound: !!header,
      bodySample: document.body.innerText.slice(0, 300),
    };
    drawer.scrollTop = drawer.scrollHeight;
    const result = {
      missing: false,
      drawerOverflowY: getComputedStyle(drawer).overflowY,
      drawerHeight: drawer.clientHeight,
      viewportHeight: innerHeight,
      headerPosition: getComputedStyle(header).position,
      headerTop: Math.round(header.getBoundingClientRect().top),
      drawerReachedBottom: drawer.scrollTop + drawer.clientHeight >= drawer.scrollHeight - 2,
      workspaceLocked: getComputedStyle(workspace).overflowY,
      horizontalOverflow: horizontalWrap ? getComputedStyle(horizontalWrap).overflowX : null,
    };
    header.querySelector('button[aria-label^="Tutup"]')?.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    workspace.scrollTop = workspace.scrollHeight;
    return {
      ...result,
      closed: !document.querySelector('.owner-drawer-backdrop'),
      workspaceRestored: getComputedStyle(workspace).overflowY,
      workspaceCanScrollAfterClose: workspace.scrollTop > 0,
    };
  })()`);

  assert.equal(detailDrawer.missing, false, `${name}: detail drawer opens (${JSON.stringify(detailDrawer)})`);
  assert.equal(detailDrawer.drawerOverflowY, "auto", `${name}: drawer owns vertical scroll`);
  assert.equal(detailDrawer.drawerHeight, height, `${name}: drawer fills the viewport`);
  assert.equal(detailDrawer.headerPosition, "sticky", `${name}: drawer header remains sticky`);
  assert.equal(detailDrawer.headerTop, 0, `${name}: drawer header stays at the viewport top`);
  assert.equal(detailDrawer.drawerReachedBottom, true, `${name}: drawer reaches its last content`);
  assert.equal(detailDrawer.workspaceLocked, "hidden", `${name}: dashboard locks while detail drawer is open`);
  assert.equal(detailDrawer.horizontalOverflow, "auto", `${name}: wide drawer table scrolls horizontally`);
  assert.equal(detailDrawer.closed, true, `${name}: detail drawer closes`);
  assert.equal(detailDrawer.workspaceRestored, "auto", `${name}: dashboard scroll restores after detail drawer closes`);
  assert.equal(detailDrawer.workspaceCanScrollAfterClose, true, `${name}: dashboard remains scrollable after detail drawer closes`);

  let drawer = null;
  if (mobile) {
    drawer = await page.evaluate(`(async () => {
      const workspace = document.querySelector('.workspace');
      document.querySelector('.mobile-menu-button')?.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      const locked = {
        open: document.querySelector('.app-shell')?.classList.contains('mobile-drawer-open'),
        overflow: getComputedStyle(workspace).overflowY,
      };
      document.querySelector('.mobile-menu-backdrop')?.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      workspace.scrollTop = 0;
      workspace.scrollTop = workspace.scrollHeight;
      return {
        locked,
        closed: !document.querySelector('.app-shell')?.classList.contains('mobile-drawer-open'),
        restoredOverflow: getComputedStyle(workspace).overflowY,
        canScrollAfterClose: workspace.scrollTop > 0,
      };
    })()`);
    assert.equal(drawer.locked.open, true, `${name}: drawer open state is applied`);
    assert.equal(drawer.locked.overflow, "hidden", `${name}: content locks while drawer is open`);
    assert.equal(drawer.closed, true, `${name}: drawer closes`);
    assert.equal(drawer.restoredOverflow, "auto", `${name}: content scroll is restored after close`);
    assert.equal(drawer.canScrollAfterClose, true, `${name}: content remains scrollable after close`);
  }

  await page.screenshot(`/private/tmp/oims-dashboard-${name}.png`);
  page.close();
  return { name, ...base, detailDrawer, drawer, runtimeErrors: page.errors };
}

const results = [];
results.push(await inspectViewport("desktop", 1440, 900, false));
results.push(await inspectViewport("tablet", 900, 900, false));
results.push(await inspectViewport("mobile", 390, 844, true));
console.log(JSON.stringify(results, null, 2));
