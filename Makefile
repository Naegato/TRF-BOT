.PHONY: requirement install up start lint lint-fix db-up db-down

requirement:
	@which pnpm > /dev/null 2>&1 || (echo "Error: pnpm is not installed. Run 'npm install -g pnpm'" && exit 1)
	@echo "pnpm is installed."

install: requirement
	pnpm install

up: install db-up
	pnpm dev

start: install
	pnpm build && pnpm start

lint: install
	pnpm lint

lint-fix: install
	pnpm lint:fix

db-up:
	docker compose up -d

db-down:
	docker compose down
