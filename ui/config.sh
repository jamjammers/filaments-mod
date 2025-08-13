echo "Please enter the server host:"
read -p "(no protocol or slashes. e.g. \"localhost:2428\") > " host
echo "export const serverHost = '$host';" > src/lib/host.ts