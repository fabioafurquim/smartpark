'use client';

import React, { useState, useEffect } from 'react';
import { Vaga, Reserva, FormularioReserva } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle, Calendar, DollarSign, MapPin } from 'lucide-react';

interface VisualizadorVagasProps {
  condominioId: string;
  usuarioId: string;
}

export function VisualizadorVagas({ condominioId, usuarioId }: VisualizadorVagasProps) {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criandoReserva, setCriandoReserva] = useState(false);
  const [formulario, setFormulario] = useState<FormularioReserva>({
    vagaId: '',
    usuarioId,
    condominioId,
    dataInicio: '',
    dataFim: '',
    tipoLocacao: undefined,
    observacoes: '',
  });

  useEffect(() => {
    carregarVagas();
  }, [condominioId]);

  const carregarVagas = async () => {
    try {
      setCarregando(true);
      const response = await fetch(`/api/vagas?condominioId=${condominioId}`);
      if (!response.ok) throw new Error('Erro ao carregar vagas');
      const dados = await response.json();
      setVagas(dados.filter((v: Vaga) => v.configuracaoLocacao?.disponivel));
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  };

  const calcularValor = (vaga: Vaga): string => {
    if (!vaga.configuracaoLocacao || !formulario.tipoLocacao) return 'N/A';

    const config = vaga.configuracaoLocacao;
    const inicio = new Date(formulario.dataInicio);
    const fim = new Date(formulario.dataFim);

    if (formulario.tipoLocacao === 'HORA' && config.valorHora) {
      const horas = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
      return `R$ ${(config.valorHora * horas).toFixed(2)}`;
    } else if (formulario.tipoLocacao === 'DIARIA' && config.valorDiaria) {
      const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      return `R$ ${(config.valorDiaria * dias).toFixed(2)}`;
    } else if (formulario.tipoLocacao === 'MENSAL' && config.valorMensal) {
      return `R$ ${config.valorMensal.toFixed(2)}`;
    } else if (formulario.tipoLocacao === 'ANUAL' && config.valorAnual) {
      return `R$ ${config.valorAnual.toFixed(2)}`;
    }

    return 'N/A';
  };

  const handleCriarReserva = async () => {
    if (!vagaSelecionada) return;

    try {
      setCriandoReserva(true);
      const response = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formulario,
          vagaId: vagaSelecionada.id,
        }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao criar reserva');
      }

      alert('Reserva criada com sucesso!');
      setVagaSelecionada(null);
      setFormulario({
        vagaId: '',
        usuarioId,
        condominioId,
        dataInicio: '',
        dataFim: '',
        tipoLocacao: undefined,
        observacoes: '',
      });
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCriandoReserva(false);
    }
  };

  if (carregando) {
    return <div className="text-center py-8">Carregando vagas disponíveis...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Vagas Disponíveis para Locação</h2>
        <p className="text-gray-600">
          {vagas.length} vaga{vagas.length !== 1 ? 's' : ''} disponível{vagas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{erro}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Vagas */}
        <div className="lg:col-span-1 space-y-3">
          {vagas.map(vaga => (
            <button
              key={vaga.id}
              onClick={() => {
                setVagaSelecionada(vaga);
                setFormulario(prev => ({ ...prev, vagaId: vaga.id }));
              }}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                vagaSelecionada?.id === vaga.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-lg">Vaga {vaga.numero}</div>
                  <div className="text-sm text-gray-600">{vaga.tipo}</div>
                  {vaga.unidade && (
                    <div className="text-xs text-gray-500 mt-1">
                      Unidade {vaga.unidade.numero}
                    </div>
                  )}
                </div>
              </div>

              {vaga.configuracaoLocacao && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-600 space-y-1">
                    {vaga.configuracaoLocacao.valorDiaria && (
                      <div>R$ {vaga.configuracaoLocacao.valorDiaria.toFixed(2)}/dia</div>
                    )}
                    {vaga.configuracaoLocacao.valorMensal && (
                      <div>R$ {vaga.configuracaoLocacao.valorMensal.toFixed(2)}/mês</div>
                    )}
                  </div>
                </div>
              )}
            </button>
          ))}

          {vagas.length === 0 && (
            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
              Nenhuma vaga disponível no momento
            </div>
          )}
        </div>

        {/* Detalhes e Formulário de Reserva */}
        {vagaSelecionada && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Reservar Vaga {vagaSelecionada.numero}</CardTitle>
              <CardDescription>
                {vagaSelecionada.tipo} - Unidade {vagaSelecionada.unidade?.numero}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Informações da Vaga */}
                {vagaSelecionada.configuracaoLocacao && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Tipos de Locação Disponíveis</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {vagaSelecionada.configuracaoLocacao.tiposPermitidos.map(tipo => (
                          <span
                            key={tipo}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {tipo}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {vagaSelecionada.configuracaoLocacao.valorHora && (
                        <div>
                          <p className="text-xs text-gray-600">Valor/Hora</p>
                          <p className="font-semibold">
                            R$ {vagaSelecionada.configuracaoLocacao.valorHora.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {vagaSelecionada.configuracaoLocacao.valorDiaria && (
                        <div>
                          <p className="text-xs text-gray-600">Valor/Dia</p>
                          <p className="font-semibold">
                            R$ {vagaSelecionada.configuracaoLocacao.valorDiaria.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {vagaSelecionada.configuracaoLocacao.valorMensal && (
                        <div>
                          <p className="text-xs text-gray-600">Valor/Mês</p>
                          <p className="font-semibold">
                            R$ {vagaSelecionada.configuracaoLocacao.valorMensal.toFixed(2)}
                          </p>
                        </div>
                      )}
                      {vagaSelecionada.configuracaoLocacao.valorAnual && (
                        <div>
                          <p className="text-xs text-gray-600">Valor/Ano</p>
                          <p className="font-semibold">
                            R$ {vagaSelecionada.configuracaoLocacao.valorAnual.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Formulário de Reserva */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tipo de Locação</label>
                    <select
                      value={formulario.tipoLocacao || ''}
                      onChange={(e) =>
                        setFormulario(prev => ({
                          ...prev,
                          tipoLocacao: e.target.value as any,
                        }))
                      }
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um tipo</option>
                      {vagaSelecionada.configuracaoLocacao?.tiposPermitidos.map(tipo => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Data de Início</label>
                      <Input
                        type="datetime-local"
                        value={formulario.dataInicio}
                        onChange={(e) =>
                          setFormulario(prev => ({
                            ...prev,
                            dataInicio: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Data de Fim</label>
                      <Input
                        type="datetime-local"
                        value={formulario.dataFim}
                        onChange={(e) =>
                          setFormulario(prev => ({
                            ...prev,
                            dataFim: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Observações (opcional)</label>
                    <textarea
                      value={formulario.observacoes}
                      onChange={(e) =>
                        setFormulario(prev => ({
                          ...prev,
                          observacoes: e.target.value,
                        }))
                      }
                      placeholder="Adicione observações sobre a reserva..."
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* Resumo do Valor */}
                  {formulario.tipoLocacao && formulario.dataInicio && formulario.dataFim && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Valor Total</span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {calcularValor(vagaSelecionada)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCriarReserva}
                      disabled={
                        criandoReserva ||
                        !formulario.tipoLocacao ||
                        !formulario.dataInicio ||
                        !formulario.dataFim
                      }
                      className="flex-1"
                    >
                      {criandoReserva ? 'Criando...' : 'Criar Reserva'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setVagaSelecionada(null);
                        setFormulario({
                          vagaId: '',
                          usuarioId,
                          condominioId,
                          dataInicio: '',
                          dataFim: '',
                          tipoLocacao: undefined,
                          observacoes: '',
                        });
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
