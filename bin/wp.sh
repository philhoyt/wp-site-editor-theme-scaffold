#!/bin/zsh
# WP-CLI against the Local site for this theme. Local's MySQL listens on a
# socket, not TCP, so point mysqli at it.
#
# Set SITE to the Local site folder name (as under ~/Local Sites) of the
# derived theme. Create the socket symlink once, and recreate it if Local
# changes the site id:
#   ln -sfn "$HOME/Library/Application Support/Local/run/<id>/mysql/mysqld.sock" "$HOME/.local-sockets/$SITE.sock"
SITE=wp-sets

php -d mysqli.default_socket="$HOME/.local-sockets/$SITE.sock" -d error_reporting="E_ALL & ~E_DEPRECATED" /opt/homebrew/bin/wp --path="$HOME/Local Sites/$SITE/app/public" "$@"
