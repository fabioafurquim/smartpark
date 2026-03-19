import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions, ehAdministradorMestre } from '@/lib/auth';
import { PERMISSOES_CATALOGO, PERFIS_PERSONALIZAVEIS } from '@/lib/permissoes';
import {
  listarConfiguracoesPermissaoCondominio,
  resetarConfiguracaoPermissaoPerfil,
  salvarConfiguracaoPermissaoPerfil,
} from '@/lib/permissoes-admin';

const permissaoKeys = PERMISSOES_CATALOGO.map((item) => item.chave);

const salvarConfiguracaoSchema = z.object({
  condominioId: z.string().min(1, 'Condominio obrigatorio'),
  tipoPerfil: z.enum(PERFIS_PERSONALIZAVEIS as [string, ...string[]]),
  permissoes: z.record(z.enum(permissaoKeys as [string, ...string[]]), z.boolean()),
});

const resetSchema = z.object({
  condominioId: z.string().min(1, 'Condominio obrigatorio'),
  tipoPerfil: z.enum(PERFIS_PERSONALIZAVEIS as [string, ...string[]]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ehAdministradorMestre(session.user as any)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const condominioId = request.nextUrl.searchParams.get('condominioId');
    if (!condominioId) {
      return NextResponse.json({ error: 'Condominio obrigatorio' }, { status: 400 });
    }

    const dados = await listarConfiguracoesPermissaoCondominio(condominioId);
    if (!dados) {
      return NextResponse.json({ error: 'Condominio nao encontrado' }, { status: 404 });
    }

    return NextResponse.json(dados);
  } catch (error) {
    console.error('Erro ao carregar configuracoes de permissao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ehAdministradorMestre(session.user as any)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const dados = salvarConfiguracaoSchema.parse(body);

    await salvarConfiguracaoPermissaoPerfil(dados);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao salvar configuracao de permissao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ehAdministradorMestre(session.user as any)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const dados = resetSchema.parse(body);

    await resetarConfiguracaoPermissaoPerfil(dados.condominioId, dados.tipoPerfil);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Erro ao resetar configuracao de permissao:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
