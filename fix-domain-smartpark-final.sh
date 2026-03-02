#!/bin/bash
# Script para corrigir domínio após deploy do Coolify - SmartPark
# Execute este script após cada redeploy no Coolify

echo "=== Corrigindo domínio smartpark.furquim.cloud após deploy ==="

# Parar container atual
echo "Parando container..."
docker stop $(docker ps -q --filter "name=t8gss8k4c0cgsgso0kk0kws8") 2>/dev/null

# Atualizar docker-compose.yaml
echo "Atualizando configuração de domínio..."
sed -i 's|t8gss8k4c0cgsgso0kk0kws8.187.77.57.122.sslip.io|smartpark.furquim.cloud|g' /data/coolify/applications/t8gss8k4c0cgsgso0kk0kws8/docker-compose.yaml
sed -i 's|http://smartpark.furquim.cloud|https://smartpark.furquim.cloud|g' /data/coolify/applications/t8gss8k4c0cgsgso0kk0kws8/docker-compose.yaml

# Verificar se as rotas HTTPS existem, se não, adicionar
if ! grep -q "https-0-t8gss8k4c0cgsgso0kk0kws8.tls.certresolver" /data/coolify/applications/t8gss8k4c0cgsgso0kk0kws8/docker-compose.yaml; then
    echo "Adicionando configuração HTTPS..."
    # Adicionar rotas HTTPS se não existirem
    sed -i '/traefik.http.routers.http-0-t8gss8k4c0cgsgso0kk0kws8.service/a\            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.entryPoints=https\n            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.middlewares=gzip\n            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.rule=Host(`smartpark.furquim.cloud`)\n            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.service=http-0-t8gss8k4c0cgsgso0kk0kws8\n            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.tls=true\n            - traefik.http.routers.https-0-t8gss8k4c0cgsgso0kk0kws8.tls.certresolver=letsencrypt' /data/coolify/applications/t8gss8k4c0cgsgso0kk0kws8/docker-compose.yaml
fi

# Reiniciar aplicação
echo "Reiniciando aplicação..."
cd /data/coolify/applications/t8gss8k4c0cgsgso0kk0kws8
docker compose up -d

echo ""
echo "=== ✅ Domínio corrigido com sucesso! ==="
echo "Acesse: https://smartpark.furquim.cloud"
echo ""
