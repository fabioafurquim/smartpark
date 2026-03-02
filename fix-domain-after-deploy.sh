#!/bin/bash

# Script para corrigir o domínio após deploy no Coolify
# Uso: ./fix-domain-after-deploy.sh

echo "=== Iniciando correção de domínio SmartPark ==="

# Obter o ID do container da aplicação SmartPark
CONTAINER_ID=$(docker ps --filter "name=smartpark" --format "{{.ID}}" | head -n 1)

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Container do SmartPark não encontrado!"
    echo "Containers disponíveis:"
    docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}"
    exit 1
fi

echo "✅ Container encontrado: $CONTAINER_ID"

# Obter o domínio atual configurado no Coolify
# Você deve substituir pelo domínio correto
DOMAIN="park.furquim.cloud"

echo "📝 Configurando domínio: $DOMAIN"

# Atualizar variável de ambiente NEXTAUTH_URL dentro do container
docker exec $CONTAINER_ID sh -c "export NEXTAUTH_URL=https://$DOMAIN"

# Reiniciar o container para aplicar as mudanças
echo "🔄 Reiniciando container..."
docker restart $CONTAINER_ID

echo "⏳ Aguardando container iniciar..."
sleep 5

# Verificar se o container está rodando
if docker ps | grep -q $CONTAINER_ID; then
    echo "✅ Container reiniciado com sucesso!"
    echo "🌐 Aplicação disponível em: https://$DOMAIN"
else
    echo "❌ Erro ao reiniciar container"
    exit 1
fi

echo "=== Domínio corrigido com sucesso! ==="
