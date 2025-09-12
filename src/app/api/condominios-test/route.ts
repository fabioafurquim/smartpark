import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/condominios-test - Listar condomínios (sem autenticação para teste)
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API condominios-test chamada');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const ativo = searchParams.get('ativo');
    
    console.log('📊 Parâmetros:', { page, limit, search, ativo });
    
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { endereco: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (ativo !== null && ativo !== undefined) {
      where.ativo = ativo === 'true';
    }
    
    console.log('🔍 Filtros WHERE:', JSON.stringify(where, null, 2));
    
    const [condominios, total] = await Promise.all([
      prisma.condominio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          endereco: true,
          telefone: true,
          email: true,
          ativo: true,
          codigoUnico: true,
          logoUrl: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      prisma.condominio.count({ where }),
    ]);
    
    console.log(`✅ Query executada - Total: ${total}, Página: ${condominios.length}`);
    
    const response = {
      condominios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    console.log('📦 Retornando resposta');
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Erro na API condominios-test:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}