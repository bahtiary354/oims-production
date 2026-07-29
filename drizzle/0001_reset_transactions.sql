UPDATE `app_state`
SET
	`payload` = json_set(
		`payload`,
		'$.dataVersion', 2,
		'$.records', json('{}'),
		'$.notes', json('[]')
	),
	`updated_at` = CURRENT_TIMESTAMP
WHERE `id` = 1;
