read -p "Please enter the server host: " host
echo "export const serverHost = '$host';" > src/lib/host.ts