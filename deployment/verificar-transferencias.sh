#!/bin/sh
# Run after ./deploy.sh on the real host. Recreates ONLY the transferencias service.
set -eu
cd /var/docker/2.0plipshop
plip_url=${PLIP_URL:-http://127.0.0.1:125}
plip_url=${plip_url%/}
work=$(mktemp -d)
file_id=''
cleanup() {
    if [ -n "$file_id" ]; then
        curl -fsS -X DELETE "$plip_url/api/transferencias/$file_id" >/dev/null || true
    fi
    rm -f "$work/prueba.png" "$work/subida.json" "$work/descarga.png" "$work/recreada.png"
    rmdir "$work"
}
trap cleanup EXIT

wait_for_api() {
    attempt=0
    until curl -fsS "$plip_url/api/transferencias" | docker-compose exec -T transferencias node -e '
        let data=""; process.stdin.on("data", chunk => data+=chunk);
        process.stdin.on("end", () => { try { process.exit(Array.isArray(JSON.parse(data)) ? 0 : 1); } catch { process.exit(1); } });
    '; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
            printf '%s\n' 'ERROR: la API no respondió. Revisar docker-compose logs frontend transferencias.' >&2
            return 1
        fi
        sleep 1
    done
}

wait_for_api
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' | base64 -d > "$work/prueba.png"
curl -fsS -F "file=@$work/prueba.png;type=image/png" "$plip_url/api/transferencias" > "$work/subida.json"
file_id=$(docker-compose exec -T transferencias node -e '
    let data=""; process.stdin.on("data", chunk => data+=chunk);
    process.stdin.on("end", () => {
        const id=JSON.parse(data).id;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) process.exit(1);
        process.stdout.write(id);
    });
' < "$work/subida.json")
curl -fsS "$plip_url/api/transferencias/$file_id/download" -o "$work/descarga.png"
cmp "$work/prueba.png" "$work/descarga.png"
cmp "$work/prueba.png" "/var/lib/plip/transferencias/$file_id/prueba.png"
printf '%s\n' 'OK: API, subida, descarga y archivo físico en el host.'

docker-compose up -d --no-deps --force-recreate transferencias
wait_for_api
curl -fsS "$plip_url/api/transferencias/$file_id/download" -o "$work/recreada.png"
cmp "$work/prueba.png" "$work/recreada.png"
cmp "$work/prueba.png" "/var/lib/plip/transferencias/$file_id/prueba.png"
printf '%s\n' 'OK: el archivo persistió al recrear Transferencias; nginx siguió enviando las peticiones.'
