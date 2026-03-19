import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { z } from 'zod';
import { middlewareEstrutura, middlewareEstruturaOperacional } from '../../../lib/auth-middleware';
import { obterCondominiosUsuario } from '../../../lib/auth';

// Schema de validação para torre/bloco
const torreSchema = z.object({
  nome: z.string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  tipo: z.enum(['TORRE', 'BLOCO'], 'Tipo deve ser TORRE ou BLOCO'),
  condominioId: z.string()
    .min(1, 'Condomínio é obrigatório')
    .regex(/^c[a-z0-9]{24}$/, 'ID do condomínio deve ser um CUID válido')
});

/**
 * GET /api/torres
 * Lista todas as torres/blocos
 * Query params: condominioId (opcional)
 */
export async function GET(request: NextRequest) {
  return middlewareEstruturaOperacional(request, async (req, usuario, condominioId) => {
    const { searchParams } = new URL(req.url);
    const condominioIdParam = searchParams.get('condominioId');

    // Obter condominios permitidos para o usuário
    const condominiosPermitidos = obterCondominiosUsuario(usuario);
    
    const where: Record<string, unknown> = {};

    // Para administrador mestre, permitir acesso a todos os condomínios
    if (condominiosPermitidos === 'TODOS_CONDOMINIOS') {
      // Se condominioId específico foi fornecido, usar apenas ele
      if (condominioIdParam) {
        where.condominioId = condominioIdParam;
      }
      // Se condominioId específico foi solicitado via middleware, usar ele
      if (condominioId) {
        where.condominioId = condominioId;
      }
      // Se nenhum filtro específico, buscar todas as torres
    } else {
      // Para outros usuários, filtrar por condominios permitidos
      const condominioIds = condominiosPermitidos.map(c => c.id);
      
      where.condominioId = {
        in: condominioIds
      };

      // Se condominioId específico foi fornecido, usar apenas ele (se permitido)
      if (condominioIdParam && condominioIds.includes(condominioIdParam)) {
        where.condominioId = condominioIdParam;
      }

      // Se condominioId específico foi solicitado, verificar se está permitido
      if (condominioId) {
        if (!condominioIds.includes(condominioId)) {
          return NextResponse.json(
            { error: 'Acesso negado ao condomínio especificado' },
            { status: 403 }
          );
        }
        where.condominioId = condominioId;
      }
    }

    const torres = await prisma.torre.findMany({
      where,
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        _count: {
          select: {
            unidades: true
          }
        }
      },
      orderBy: [
        { condominio: { nome: 'asc' } },
        { nome: 'asc' }
      ]
    });

    // Formatar resposta
    const torresFormatadas = torres.map(torre => ({
      id: torre.id,
      nome: torre.nome,
      tipo: torre.tipo,
      condominioId: torre.condominioId,
      condominio: torre.condominio,
      totalUnidades: torre._count.unidades,
      criadoEm: torre.criadoEm.toISOString()
    }));

    return NextResponse.json(torresFormatadas);
  });
}

/**
 * POST /api/torres
 * Cria uma nova torre/bloco
 */
export async function POST(request: NextRequest) {
  return middlewareEstrutura(request, async (req, usuario, condominioId) => {
    try {
      const body = await req.json();
      
      console.log('🔍 DEBUG API - Dados recebidos:', {
        body,
        usuario: usuario?.email,
        condominioId
      });
      
      // Validar dados
      const validation = torreSchema.safeParse(body);
      if (!validation.success) {
        console.error('🔍 DEBUG API - Erro de validação:', validation.error.format());
        return NextResponse.json(
          { 
            error: 'Dados inválidos',
            details: validation.error.format()
          },
          { status: 400 }
        );
      }

      const { nome, tipo, condominioId: bodyCondominioId } = validation.data;

      // Obter condominios permitidos para o usuário
      const condominiosPermitidos = obterCondominiosUsuario(usuario);
      
      console.log('🔍 DEBUG API - Condominios permitidos:', condominiosPermitidos);
      
      // Para administrador mestre, permitir acesso a qualquer condomínio
      if (condominiosPermitidos === 'TODOS_CONDOMINIOS') {
        // Administrador mestre pode acessar qualquer condomínio
        // Verificar apenas se o condomínio existe
        const condominio = await prisma.condominio.findUnique({
          where: { id: bodyCondominioId }
        });

        if (!condominio) {
          console.error('🔍 DEBUG API - Condomínio não encontrado:', bodyCondominioId);
          return NextResponse.json(
            { error: 'Condomínio não encontrado' },
            { status: 404 }
          );
        }
      } else {
        // Para outros usuários, verificar permissões normalmente
        const condominioIds = condominiosPermitidos.map(c => c.id);

        // Verificar se o usuário tem permissão para o condomínio
        if (!condominioIds.includes(bodyCondominioId)) {
          return NextResponse.json(
            { 
              error: {
                code: 'FORBIDDEN',
                message: 'Acesso negado ao condomínio especificado'
              }
            },
            { status: 403 }
          );
        }

        // Verificar se o condomínio existe
        const condominio = await prisma.condominio.findUnique({
          where: { id: bodyCondominioId }
        });

        if (!condominio) {
          return NextResponse.json(
            { error: 'Condomínio não encontrado' },
            { status: 404 }
          );
        }
      }

    // Verificar se já existe torre/bloco com mesmo nome no condomínio
    const torreExistente = await prisma.torre.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: 'insensitive' // Case insensitive
        },
        condominioId: bodyCondominioId
      }
    });

    if (torreExistente) {
      return NextResponse.json(
        { error: 'Já existe uma torre/bloco com este nome neste condomínio' },
        { status: 409 } // Conflict
      );
    }

    const novaTorre = await prisma.torre.create({
      data: {
        nome,
        tipo,
        condominioId: bodyCondominioId
      },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true
          }
        },
        _count: {
          select: {
            unidades: true
          }
        }
      }
    });

    // Garantir que temos todos os campos necessários
    if (!novaTorre) {
      throw new Error('Falha ao criar torre');
    }

    const torreFormatada = {
      id: novaTorre.id,
      nome: novaTorre.nome,
      tipo: novaTorre.tipo,
      condominioId: novaTorre.condominioId,
      condominio: novaTorre.condominio,
      totalUnidades: novaTorre._count.unidades,
      criadoEm: novaTorre.criadoEm.toISOString()
    };

    console.log('🔍 DEBUG API - Torre criada com sucesso:', torreFormatada);
    return NextResponse.json(torreFormatada, { status: 201 });
    
    } catch (error) {
      console.error('🔍 DEBUG API - Erro interno:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  });
}
