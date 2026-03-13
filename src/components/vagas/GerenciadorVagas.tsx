'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Vaga, FormularioConfiguracaoLocacao } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Edit2, Trash2, Save, AlertCircle } from 'lucide-react';

interface GerenciadorVagasProps {
  condominioId: string;
  usuarioId: string;
}

export function GerenciadorVagas({ condominioId, usuarioId }: GerenciadorVagasProps) {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);
  const [editando, setEditando] = useState(false);
  const [formulario, setFormulario] = useState<FormularioConfiguracaoLocacao>({
    disponivel: false,
    tiposPermitidos: [],
    valorHora: null,
    valorDiaria: null,
    valorMensal: null,
    valorAnual: null,
  });

  const carregarVagas = useCallback(async () => {
    try {
      setCarregando(true);
      const response = await fetch(`/api/vagas?condominioId=${condominioId}`);
      if (!response.ok) throw new Error('Erro ao carregar vagas');
      const dados = await response.json();
      setVagas(dados);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, [condominioId]);

  useEffect(() => {
    carregarVagas();
  }, [carregarVagas]);

  const handleSelecionarVaga = (vaga: Vaga) => {
    setVagaSelecionada(vaga);
    if (vaga.configuracaoLocacao) {
      setFormulario({
        disponivel: vaga.configuracaoLocacao.disponivel,
        tiposPermitidos: vaga.configuracaoLocacao.tiposPermitidos,
        valorHora: vaga.configuracaoLocacao.valorHora,
        valorDiaria: vaga.configuracaoLocacao.valorDiaria,
        valorMensal: vaga.configuracaoLocacao.valorMensal,
        valorAnual: vaga.configuracaoLocacao.valorAnual,
      });
    }
    setEditando(false);
  };

  const handleToggleTipo = (tipo: string) => {
    setFormulario(prev => ({
      ...prev,
      tiposPermitidos: prev.tiposPermitidos.includes(tipo as any)
        ? prev.tiposPermitidos.filter(t => t !== tipo)
        : [...prev.tiposPermitidos, tipo as any]
    }));
  };

  const handleSalvarConfiguracao = async () => {
    if (!vagaSelecionada) return;

    try {
      const response = await fetch(`/api/vagas/${vagaSelecionada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proprietarioId: usuarioId,
          configuracaoLocacao: formulario,
        }),
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao salvar configuração');
      }

      const vagaAtualizada = await response.json();
      setVagas(vagas.map(v => v.id === vagaAtualizada.id ? vagaAtualizada : v));
      setVagaSelecionada(vagaAtualizada);
      setEditando(false);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const handleDeletarVaga = async (vagaId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta vaga?')) return;

    try {
      const response = await fetch(`/api/vagas/${vagaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || 'Erro ao deletar vaga');
      }

      setVagas(vagas.filter(v => v.id !== vagaId));
      setVagaSelecionada(null);
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  if (carregando) {
    return <div className="text-center py-8">Carregando vagas...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de Vagas */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Minhas Vagas</CardTitle>
          <CardDescription>Vagas que você possui</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {vagas.filter(v => v.proprietarioId === usuarioId).map(vaga => (
              <button
                key={vaga.id}
                onClick={() => handleSelecionarVaga(vaga)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  vagaSelecionada?.id === vaga.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold">Vaga {vaga.numero}</div>
                <div className="text-sm text-gray-600">{vaga.tipo}</div>
                {vaga.configuracaoLocacao?.disponivel && (
                  <div className="text-xs text-green-600 mt-1">✓ Disponível para locação</div>
                )}
              </button>
            ))}
            {vagas.filter(v => v.proprietarioId === usuarioId).length === 0 && (
              <p className="text-gray-500 text-sm">Nenhuma vaga atribuída a você</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes e Configuração */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {vagaSelecionada ? `Vaga ${vagaSelecionada.numero}` : 'Selecione uma vaga'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {erro && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{erro}</p>
            </div>
          )}

          {vagaSelecionada && (
            <div className="space-y-6">
              {/* Informações da Vaga */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-semibold">{vagaSelecionada.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unidade</p>
                  <p className="font-semibold">{vagaSelecionada.unidade?.numero}</p>
                </div>
              </div>

              {/* Configuração de Locação */}
              {editando ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      id="disponivel"
                      type="checkbox"
                      checked={formulario.disponivel}
                      onChange={(e) =>
                        setFormulario(prev => ({ ...prev, disponivel: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="disponivel" className="text-sm font-medium">Disponível para locação</label>
                  </div>

                  {formulario.disponivel && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-2">Tipos de Locação Permitidos</p>
                        <div className="space-y-2">
                          {['HORA', 'DIARIA', 'MENSAL', 'ANUAL'].map(tipo => (
                            <div key={tipo} className="flex items-center space-x-2">
                              <input
                                id={tipo}
                                type="checkbox"
                                checked={formulario.tiposPermitidos.includes(tipo as any)}
                                onChange={() => handleToggleTipo(tipo)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                              <label htmlFor={tipo} className="text-sm">{tipo}</label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {formulario.tiposPermitidos.includes('HORA') && (
                          <div>
                            <label htmlFor="valorHora" className="text-sm font-medium">Valor/Hora (R$)</label>
                            <Input
                              id="valorHora"
                              type="number"
                              step="0.01"
                              value={formulario.valorHora || ''}
                              onChange={(e) =>
                                setFormulario(prev => ({
                                  ...prev,
                                  valorHora: e.target.value ? parseFloat(e.target.value) : null
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        )}
                        {formulario.tiposPermitidos.includes('DIARIA') && (
                          <div>
                            <label htmlFor="valorDiaria" className="text-sm font-medium">Valor/Dia (R$)</label>
                            <Input
                              id="valorDiaria"
                              type="number"
                              step="0.01"
                              value={formulario.valorDiaria || ''}
                              onChange={(e) =>
                                setFormulario(prev => ({
                                  ...prev,
                                  valorDiaria: e.target.value ? parseFloat(e.target.value) : null
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        )}
                        {formulario.tiposPermitidos.includes('MENSAL') && (
                          <div>
                            <label htmlFor="valorMensal" className="text-sm font-medium">Valor/Mês (R$)</label>
                            <Input
                              id="valorMensal"
                              type="number"
                              step="0.01"
                              value={formulario.valorMensal || ''}
                              onChange={(e) =>
                                setFormulario(prev => ({
                                  ...prev,
                                  valorMensal: e.target.value ? parseFloat(e.target.value) : null
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        )}
                        {formulario.tiposPermitidos.includes('ANUAL') && (
                          <div>
                            <label htmlFor="valorAnual" className="text-sm font-medium">Valor/Ano (R$)</label>
                            <Input
                              id="valorAnual"
                              type="number"
                              step="0.01"
                              value={formulario.valorAnual || ''}
                              onChange={(e) =>
                                setFormulario(prev => ({
                                  ...prev,
                                  valorAnual: e.target.value ? parseFloat(e.target.value) : null
                                }))
                              }
                              placeholder="0.00"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSalvarConfiguracao} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditando(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold">
                      {vagaSelecionada.configuracaoLocacao?.disponivel
                        ? '✓ Disponível para locação'
                        : '✗ Não disponível'}
                    </p>
                  </div>

                  {vagaSelecionada.configuracaoLocacao?.disponivel && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Tipos Permitidos</p>
                        <div className="flex gap-2 mt-2">
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
                        {vagaSelecionada.configuracaoLocacao.valorHora !== null && (
                          <div>
                            <p className="text-sm text-gray-600">Valor/Hora</p>
                            <p className="font-semibold">
                              R$ {vagaSelecionada.configuracaoLocacao.valorHora.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {vagaSelecionada.configuracaoLocacao.valorDiaria !== null && (
                          <div>
                            <p className="text-sm text-gray-600">Valor/Dia</p>
                            <p className="font-semibold">
                              R$ {vagaSelecionada.configuracaoLocacao.valorDiaria.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {vagaSelecionada.configuracaoLocacao.valorMensal !== null && (
                          <div>
                            <p className="text-sm text-gray-600">Valor/Mês</p>
                            <p className="font-semibold">
                              R$ {vagaSelecionada.configuracaoLocacao.valorMensal.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {vagaSelecionada.configuracaoLocacao.valorAnual !== null && (
                          <div>
                            <p className="text-sm text-gray-600">Valor/Ano</p>
                            <p className="font-semibold">
                              R$ {vagaSelecionada.configuracaoLocacao.valorAnual.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => setEditando(true)} className="flex-1">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDeletarVaga(vagaSelecionada.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
