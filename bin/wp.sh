#!/bin/zsh
# WP-CLI for this theme's dev site.
#
# Prefers the Local site when its MySQL socket is reachable, and falls back to
# the wp-env site from .wp-env.json (npm run wp-env:start) otherwise.
#
# Local: set SITE to the Local site folder name (as under ~/Local Sites) of the
# derived theme. Local's MySQL listens on a socket, not TCP, so mysqli is
# pointed at it. Create the socket symlink once, and recreate it if Local
# changes the site id:
#   ln -sfn "$HOME/Library/Application Support/Local/run/<id>/mysql/mysqld.sock" "$HOME/.local-sockets/$SITE.sock"
#
# wp-env: .wp-env.json mounts the theme at wp-content/themes/wpsets and the
# command runs from there, so theme-relative paths (eval-file bin/seed-content.php)
# work under both. Absolute host paths do not exist inside the container.
SITE=wp-sets
THEME_PATH=wp-content/themes/wpsets
SOCK="$HOME/.local-sockets/$SITE.sock"
PUBLIC="$HOME/Local Sites/$SITE/app/public"

if [ -S "$SOCK" ] && [ -d "$PUBLIC" ]; then
	exec php -d mysqli.default_socket="$SOCK" -d error_reporting="E_ALL & ~E_DEPRECATED" /opt/homebrew/bin/wp --path="$PUBLIC" "$@"
fi

cd "$(dirname "$0")/.." || exit 1
exec npx --no-install wp-env run cli --env-cwd="$THEME_PATH" wp "$@"
