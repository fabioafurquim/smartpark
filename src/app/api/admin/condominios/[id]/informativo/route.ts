import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { authOptions, ehAdministradorMestre } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const paramsSchema = z.object({
  id: z.string().min(1, 'ID do condominio invalido'),
});

function montarBaseUrl(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '') || 'https';

  if (!host) {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000';
  }

  return `${protocol}://${host}`;
}

function normalizarNomeArquivo(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ehAdministradorMestre(session.user as any)) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const { id } = paramsSchema.parse(await params);
    const condominio = await prisma.condominio.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        codigoUnico: true,
        modalidade: true,
      },
    });

    if (!condominio) {
      return NextResponse.json({ erro: 'Condominio nao encontrado' }, { status: 404 });
    }

    const baseUrl = montarBaseUrl(request);
    const urlCadastro = `${baseUrl}/cadastro?codigo=${encodeURIComponent(condominio.codigoUnico)}`;
    const qrCodeDataUrl = await QRCode.toDataURL(urlCadastro, {
      margin: 1,
      width: 512,
      color: {
        dark: '#1D4ED8',
        light: '#FFFFFF',
      },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);

    page.drawRectangle({
      x: 0,
      y: height - 130,
      width,
      height: 130,
      color: rgb(0.93, 0.96, 1),
    });

    page.drawText('SmartPark', {
      x: 48,
      y: height - 58,
      size: 24,
      font: fontBold,
      color: rgb(0.11, 0.31, 0.85),
    });

    page.drawText('Informativo de cadastro para moradores', {
      x: 48,
      y: height - 84,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });

    page.drawText(`Condominio: ${condominio.nome}`, {
      x: 48,
      y: height - 140,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });

    page.drawText('Codigo do condominio', {
      x: 48,
      y: height - 190,
      size: 12,
      font: fontRegular,
      color: rgb(0.39, 0.45, 0.55),
    });

    page.drawRectangle({
      x: 48,
      y: height - 245,
      width: 210,
      height: 42,
      color: rgb(0.92, 0.96, 1),
      borderColor: rgb(0.73, 0.84, 1),
      borderWidth: 1,
    });

    page.drawText(condominio.codigoUnico, {
      x: 64,
      y: height - 230,
      size: 22,
      font: fontBold,
      color: rgb(0.11, 0.31, 0.85),
    });

    page.drawText('Escaneie o QR Code para acessar a pagina de cadastro:', {
      x: 48,
      y: height - 290,
      size: 12,
      font: fontRegular,
      color: rgb(0.39, 0.45, 0.55),
    });

    page.drawImage(qrCodeImage, {
      x: 48,
      y: height - 520,
      width: 180,
      height: 180,
    });

    page.drawText('Ou acesse pelo navegador:', {
      x: 270,
      y: height - 340,
      size: 12,
      font: fontRegular,
      color: rgb(0.39, 0.45, 0.55),
    });

    const linhasUrl = [
      urlCadastro.slice(0, 48),
      urlCadastro.length > 48 ? urlCadastro.slice(48, 96) : '',
      urlCadastro.length > 96 ? urlCadastro.slice(96) : '',
    ].filter(Boolean);

    linhasUrl.forEach((linha, index) => {
      page.drawText(linha, {
        x: 270,
        y: height - 365 - index * 18,
        size: 11,
        font: fontRegular,
        color: rgb(0.11, 0.31, 0.85),
      });
    });

    page.drawText('Como realizar o cadastro', {
      x: 48,
      y: height - 565,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });

    const instrucoes = [
      '1. Escaneie o QR Code ou acesse o link informado acima.',
      '2. Confira se o codigo do condominio ja apareceu preenchido.',
      '3. Informe seus dados pessoais e escolha sua unidade.',
      '4. Envie a solicitacao de cadastro para analise do condominio.',
      '5. Apos a aprovacao, acesse o sistema com seu email e senha.',
    ];

    instrucoes.forEach((instrucao, index) => {
      page.drawText(instrucao, {
        x: 48,
        y: height - 595 - index * 24,
        size: 12,
        font: fontRegular,
        color: rgb(0.19, 0.24, 0.31),
      });
    });

    page.drawText('Observacao importante', {
      x: 48,
      y: height - 735,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.14, 0.22),
    });

    page.drawText(
      'Caso sua unidade ainda nao apareca na lista, entre em contato com a administracao ou sindicatura do condominio.',
      {
        x: 48,
        y: height - 758,
        size: 11,
        font: fontRegular,
        color: rgb(0.39, 0.45, 0.55),
        maxWidth: width - 96,
        lineHeight: 15,
      }
    );

    page.drawText(`Modalidade atual do condominio: ${condominio.modalidade}`, {
      x: 48,
      y: 44,
      size: 10,
      font: fontRegular,
      color: rgb(0.55, 0.59, 0.67),
    });

    const pdfBytes = await pdfDoc.save();
    const nomeArquivo = `informativo-cadastro-${normalizarNomeArquivo(condominio.nome)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar informativo do condominio:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { erro: 'Parametros invalidos', detalhes: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
