#!/bin/bash

# Script para corrigir o domínio após deploy no Coolify - SmartPark
# Uso: ./fix-domain-smartpark.sh

echo "=== Iniciando correção de domínio SmartPark ==="

# Obter o ID do container da aplicação SmartPark
CONTAINER_ID=$(docker ps --filter "name=t8gss8k4c0cgsgso0kk0kws8" --format "{{.ID}}" | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Container do SmartPark não encontrado!"
    echo "Containers disponíveis:"
    docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}"
    exit 1
fi

CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER_ID" --format "{{.Names}}")
echo "✅ Container encontrado: $CONTAINER_NAME ($CONTAINER_ID)"

# Domínio correto
DOMAIN="smartpark.furquim.cloud"

echo "📝 Configurando domínio: $DOMAIN"

# Verificar variável atual
echo "🔍 Verificando NEXTAUTH_URL atual..."
docker exec $CONTAINER_ID env | grep NEXTAUTH_URL

# Reiniciar o container para garantir que está usando as variáveis corretas
echo "🔄 Reiniciando container..."
docker restart $CONTAINER_ID

echo "⏳ Aguardando container iniciar..."
sleep 10

# Verificar se o container está rodando
if docker ps | grep -q $CONTAINER_ID; then
    echo "✅ Container reiniciado com sucesso!"
    echo ""
    echo "🔍 Verificando logs..."
    docker logs --tail 5 $CONTAINER_ID
    echo ""
    echo "🌐 Aplicação disponível em: https://$DOMAIN"
else
    echo "❌ Erro ao reiniciar container"
    exit 1
fi

echo ""
echo "=== Domínio corrigido com sucesso! ==="
echo "Aguarde alguns segundos e acesse: https://smartpark.furquim.cloud"
