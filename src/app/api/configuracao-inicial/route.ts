import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { configuracaoInicialSchema } from '@/lib/validations';

// Definição inline do tipo para contornar problema de importação
type TipoPerfilUsuario = 
  | 'administrador_mestre'
  | 'administrador_condominio'
  | 'sindico'
  | 'morador';

/**
 * API Route para configuração inicial do sistema SmartPark
 * POST /api/configuracao-inicial
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se o sistema já foi configurado
    const configuracaoExistente = await prisma.configuracaoSistema.findFirst();
    
    if (configuracaoExistente && configuracaoExistente.administradorMestreConfigurado) {
      return NextResponse.json(
        { erro: 'Sistema já foi configurado' },
        { status: 400 }
      );
    }

    // Validar dados de entrada
    const body = await request.json();
    const dadosValidados = configuracaoInicialSchema.parse(body);

    // Verificar se já existe um usuário com o email do admin
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: dadosValidados.emailAdmin }
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Já existe um usuário com este email' },
        { status: 400 }
      );
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(dadosValidados.senhaAdmin, 12);

    // Transação para criar configuração e administrador
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar usuário administrador
      const novoUsuario = await tx.usuario.create({
        data: {
          nome: dadosValidados.nomeAdmin,
          email: dadosValidados.emailAdmin,
          senha: senhaHash,
          ativo: true,
        },
      });

      // 2. Criar um condomínio temporário para o administrador mestre
      const condominioMestre = await tx.condominio.create({
        data: {
          nome: 'Sistema - Administração',
          endereco: 'Sistema',
          codigoUnico: 'ADMIN_MASTER',
          ativo: true,
        },
      });

      // 3. Criar perfil de administrador mestre
      await tx.perfilUsuario.create({
        data: {
          usuarioId: novoUsuario.id,
          condominioId: condominioMestre.id,
          tipo: 'administrador_mestre',
          ativo: true,
        },
      });

      // 4. Atualizar ou criar configuração do sistema
      const configuracao = configuracaoExistente
        ? await tx.configuracaoSistema.update({
            where: { id: configuracaoExistente.id },
            data: {
              administradorMestreConfigurado: true,
            },
          })
        : await tx.configuracaoSistema.create({
            data: {
              administradorMestreConfigurado: true,
            },
          });

      return {
        usuario: novoUsuario,
        configuracao,
        condominioMestre,
      };
    });

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: 'Sistema configurado com sucesso',
        dados: {
          usuarioId: resultado.usuario.id,
          configuracaoId: resultado.configuracao.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro na configuração inicial:', error);

    // Erro de validação do Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          erro: 'Dados inválidos',
          detalhes: error.message,
        },
        { status: 400 }
      );
    }

    // Erro do Prisma
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { erro: 'Email já está em uso' },
        { status: 400 }
      );
    }

    // Erro genérico
    return NextResponse.json(
      {
        erro: 'Erro interno do servidor',
        mensagem: 'Ocorreu um erro durante a configuração do sistema',
      },
      { status: 500 }
    );
  }
}

/**
 * Verificar se o sistema já foi configurado
 * GET /api/configuracao-inicial
 */
export async function GET() {
  try {
    let configuracao = await prisma.configuracaoSistema.findFirst({
      select: {
        id: true,
        administradorMestreConfigurado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    // Se não existe configuração, criar uma com status false
    if (!configuracao) {
      configuracao = await prisma.configuracaoSistema.create({
        data: {
          administradorMestreConfigurado: false,
        },
        select: {
          id: true,
          administradorMestreConfigurado: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });
    }

    return NextResponse.json({
      configurado: configuracao.administradorMestreConfigurado,
      dados: configuracao,
    });
  } catch (error) {
    console.error('Erro ao verificar configuração:', error);
    
    return NextResponse.json(
      {
        erro: 'Erro interno do servidor',
        mensagem: 'Não foi possível verificar a configuração do sistema',
      },
      { status: 500 }
    );
  }
}
