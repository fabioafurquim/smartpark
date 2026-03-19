import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Fluxo de aprovacao desativado. O uso da vaga e confirmado automaticamente quando ela esta disponivel no periodo selecionado.',
    },
    { status: 410 }
  );
}
