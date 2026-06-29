# Knowledge Base — WP-SETS

A per-project lookup table for API constraints, version-specific gotchas, and findings from external docs. Not prose — one line per entry.

Format: `topic — finding — source URL`

## WordPress

- (none yet)

## Block editor / theme.json

- (none yet)

## Build tooling

- Stylelint 17 toolchain is blocked: `@wordpress/scripts@32` → `@wordpress/stylelint-config@23` pins `@stylistic/stylelint-plugin@^3` (peer `stylelint ^16.8`), so `stylelint@17` / `@stylistic@5` / `stylelint-config-standard-scss@17` can't resolve. Re-evaluate after a wp-scripts major bumps its bundled config. — npm peer ranges, verified 2026-06-29

## Local environment

- (none yet)
