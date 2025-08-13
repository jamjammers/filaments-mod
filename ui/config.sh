#!/bin/bash

host=""
while [[ $# -gt 0 ]]; do
  case $1 in
  --host)
    if [[ -n "$2" && "$2" != --* ]]; then
      host="$2"
      shift 2
    else
      echo "Error: --host flag requires a value"
      exit 1
    fi
    ;;
  *)
    shift
    ;;
  esac
done

if [[ -z "$host" ]]; then
  echo "Please enter the server host:"
  read -p "(no protocol or slashes. e.g. \"localhost:2428\") > " host
fi

echo "export const serverHost = '$host';" >src/lib/host.ts
