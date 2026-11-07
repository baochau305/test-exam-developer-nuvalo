DC = docker compose
PHP = $(DC) exec php

.PHONY: setup up down fresh test shell logs

setup:
	@test -f .env || cp .env.example .env
	$(DC) up -d --build
	$(PHP) composer install --no-interaction
	@grep -q "^APP_KEY=." .env || $(PHP) php artisan key:generate
	$(PHP) php artisan migrate --seed --force

up:
	$(DC) up -d

down:
	$(DC) down

fresh:
	$(PHP) php artisan migrate:fresh --seed --force

test:
	$(PHP) php artisan test

shell:
	$(PHP) bash

logs:
	$(DC) logs -f
