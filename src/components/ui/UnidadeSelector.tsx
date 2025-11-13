'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Building2 } from 'lucide-react';

interface Unidade {
  id: string;
  numero: string;
  torre: {
    nome: string;
    tipo: string;
  };
  andar: number;
  tipo: string;
}

interface UnidadeSelectorProps {
  condominioId: string;
  value?: string;
  onChange: (unidadeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export default function UnidadeSelector({
  condominioId,
  value,
  onChange,
  placeholder = "Selecione uma unidade",
  disabled = false,
  required = false,
  error
}: UnidadeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [filteredUnidades, setFilteredUnidades] = useState<Unidade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 50;

  // Buscar unidades quando o condomínio mudar
  useEffect(() => {
    const fetchUnidades = async () => {
      if (!condominioId) return;
      
      console.log('🔍 DEBUG UnidadeSelector - Buscando unidades para condominioId:', condominioId);
      setIsLoading(true);
      try {
        const url = `/api/unidades?condominioId=${condominioId}`;
        console.log('🔍 DEBUG UnidadeSelector - URL da requisição:', url);
        
        const response = await fetch(url);
        console.log('🔍 DEBUG UnidadeSelector - Status da resposta:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 DEBUG UnidadeSelector - Dados recebidos:', data);
          console.log('🔍 DEBUG UnidadeSelector - Número de unidades:', data.length);
          
          setUnidades(data || []);
          setPage(1);
          setHasMore((data || []).length >= ITEMS_PER_PAGE);
        } else {
          console.error('🔍 DEBUG UnidadeSelector - Erro ao buscar unidades:', response.statusText);
          setUnidades([]);
        }
      } catch (error) {
        console.error('🔍 DEBUG UnidadeSelector - Erro na requisição:', error);
        setUnidades([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (condominioId) {
      fetchUnidades();
    } else {
      setUnidades([]);
      setFilteredUnidades([]);
      setSelectedUnidade(null);
    }
  }, [condominioId, ITEMS_PER_PAGE]);

  // Filtrar unidades baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUnidades(unidades.slice(0, page * ITEMS_PER_PAGE));
    } else {
      const filtered = unidades.filter(unidade => 
        unidade.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unidade.torre.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUnidades(filtered.slice(0, page * ITEMS_PER_PAGE));
    }
  }, [searchTerm, unidades, page]);

  // Encontrar unidade selecionada quando o value mudar
  useEffect(() => {
    if (value && unidades.length > 0) {
      const unidade = unidades.find(u => u.id === value);
      setSelectedUnidade(unidade || null);
    } else {
      setSelectedUnidade(null);
    }
  }, [value, unidades]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnidades = async () => {
    if (!condominioId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/unidades?condominioId=${condominioId}`);
      if (response.ok) {
        const data = await response.json();
        setUnidades(data);
        setPage(1);
        setHasMore(data.length > ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    onChange(unidade.id);
    setIsOpen(false);
    setSearchTerm('');
    setPage(1);
  };

  const handleOpen = () => {
    if (!disabled && condominioId) {
      setIsOpen(true);
      // Focar no input de busca quando abrir
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  const getDisplayText = () => {
    if (selectedUnidade) {
      return `${selectedUnidade.numero} - ${selectedUnidade.torre.nome}`;
    }
    return placeholder;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Campo de seleção */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || !condominioId}
        className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${
          disabled || !condominioId ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={selectedUnidade ? 'text-gray-900' : 'text-gray-500'}>
            {getDisplayText()}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Campo de busca */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por número ou torre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lista de unidades */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2">Carregando unidades...</p>
              </div>
            ) : filteredUnidades.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>
                  {searchTerm ? 'Nenhuma unidade encontrada' : 'Nenhuma unidade disponível'}
                </p>
              </div>
            ) : (
              <>
                {filteredUnidades.map((unidade) => (
                  <button
                    key={unidade.id}
                    type="button"
                    onClick={() => handleSelect(unidade)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                      selectedUnidade?.id === unidade.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Unidade {unidade.numero}
                        </div>
                        <div className="text-sm text-gray-500">
                          {unidade.torre.nome} • {unidade.andar}º andar • {unidade.tipo}
                        </div>
                      </div>
                      {selectedUnidade?.id === unidade.id && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
                
                {/* Botão carregar mais */}
                {hasMore && filteredUnidades.length >= page * ITEMS_PER_PAGE && (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="w-full px-4 py-3 text-center text-blue-600 hover:bg-blue-50 focus:outline-none focus:bg-blue-50"
                  >
                    Carregar mais unidades...
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mensagem de erro */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Texto de ajuda */}
      {required && (
        <p className="mt-1 text-xs text-gray-500">
          * Campo obrigatório
        </p>
      )}
    </div>
  );
}