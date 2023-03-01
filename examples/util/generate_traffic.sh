#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

express() {
	times=$((RANDOM % 50 + 20))
	for _ in $(seq $times); do
		req=$((RANDOM % 3 + 0))
		case $req in
		0)
			curl -s http://localhost:8080/ >/dev/null
			;;
		1)
			curl -s http://localhost:8080/bad >/dev/null
			;;
		2)
			curl -s http://localhost:8080/async >/dev/null
			;;
		esac
	done

}

fastify() {
	times=$((RANDOM % 20 + 10))
	for _ in $(seq $times); do
		req=$((RANDOM % 2 + 0))
		data='{ "name": "Abernathy", "price": 2.5 }'
		case $req in
		0)
			curl -s http://localhost:8080/tulips/ >/dev/null
			;;
		1)
			curl -s --data "$data" --header "Content-Type: application/json" http://localhost:8080/tulips/ >/dev/null
			;;
		esac
	done
}

nestjs() {
	times=$((RANDOM % 50 + 10))
	for _ in $(seq $times); do
		curl -s http://localhost:8080/ >/dev/null
	done
}

echo -ne "
Pick an example you'd like to generate sample traffic for:
1) express
2) fastify
3) nestjs
0) Exit

Choose an option: "

read -r res

case $res in
1)
	echo "Generating traffic for express..."
	express
	;;
2)
	echo "Generating traffic for fastify+prisma..."
	fastify
	;;
3)
	echo "Generating traffic for nestjs..."
	nestjs
	;;
0)
	echo "Exiting..."
	exit 0
	;;
*)
	echo "Wrong option."
	exit 1
	;;
esac
