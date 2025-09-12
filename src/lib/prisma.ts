import { PrismaClient } from '@prisma/client';

// Declaração global para evitar múltiplas instâncias do Prisma em desenvolvimento
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Instância única do Prisma Client
 * Em desenvolvimento, reutiliza a instância para evitar esgotamento de conexões
 * Em produção, cria uma nova instância
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Em desenvolvimento, armazena a instância globalmente
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Função para verificar a conexão com o banco de dados
 * @returns Promise<boolean> - true se conectado, false caso contrário
 */
export async function verificarConexaoBanco(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
}

/**
 * Função para desconectar do banco de dados
 * Útil para limpeza em testes ou shutdown da aplicação
 */
export async function desconectarBanco(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erro ao desconectar do banco de dados:', error);
  }
}

/**
 * Função para verificar se o sistema já foi configurado
 * @returns Promise<boolean> - true se já configurado, false caso contrário
 */
export async function verificarConfiguracaoSistema(): Promise<boolean> {
  try {
    const config = await prisma.configuracaoSistema.findFirst();
    return config?.administradorMestreConfigurado ?? false;
  } catch (error) {
    console.error('Erro ao verificar configuração do sistema:', error);
    return false;
  }
}

/**
 * Função para marcar o sistema como configurado
 * @returns Promise<void>
 */
export async function marcarSistemaConfigurado(): Promise<void> {
  try {
    await prisma.configuracaoSistema.upsert({
      where: { id: 'sistema' },
      update: { administradorMestreConfigurado: true },
      create: {
        id: 'sistema',
        administradorMestreConfigurado: true,
      },
    });
  } catch (error) {
    console.error('Erro ao marcar sistema como configurado:', error);
    throw error;
  }
}