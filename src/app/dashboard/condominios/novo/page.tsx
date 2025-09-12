'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';
import { criarCondominioSchema } from '@/lib/validations';

type FormData = z.infer<typeof criarCondominioSchema>;

interface FormErrors {
  [key: string]: string;
}

export default function NovoCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    endereco: '',
    telefone: '',
    email: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      criarCondominioSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/condominios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          // Erros de validação do servidor
          const newErrors: FormErrors = {};
          data.details.forEach((err: any) => {
            if (err.path[0]) {
              newErrors[err.path[0]] = err.message;
            }
          });
          setErrors(newErrors);
        } else {
          // Erro geral
          setErrors({ general: data.error || 'Erro ao criar condomínio' });
        }
        return;
      }

      // Sucesso - redirecionar para a lista
      router.push('/dashboard/condominios');
    } catch (error) {
      setErrors({ general: 'Erro de conexão. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/condominios"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Condomínio</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preencha as informações para criar um novo condomínio
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Erro Geral */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-600">{errors.general}</div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                Nome do Condomínio *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="nome"
                  id="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.nome ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Ex: Residencial Jardim das Flores"
                />
                {errors.nome && (
                  <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div className="sm:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                Endereço Completo *
              </label>
              <div className="mt-1">
                <textarea
                  name="endereco"
                  id="endereco"
                  rows={3}
                  value={formData.endereco}
                  onChange={handleInputChange}
                  className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.endereco ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Rua, número, bairro, cidade, CEP"
                />
                {errors.endereco && (
                  <p className="mt-1 text-sm text-red-600">{errors.endereco}</p>
                )}
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  name="telefone"
                  id="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.telefone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="(11) 99999-9999"
                />
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="contato@condominio.com.br"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Logo URL */}
            <div className="sm:col-span-2">
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
                URL do Logo
              </label>
              <div className="mt-1">
                <input
                  type="url"
                  name="logoUrl"
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleInputChange}
                  className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.logoUrl ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="https://exemplo.com/logo.png"
                />
                {errors.logoUrl && (
                  <p className="mt-1 text-sm text-red-600">{errors.logoUrl}</p>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                URL da imagem do logo do condomínio (opcional)
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/condominios"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </>
              ) : (
                'Criar Condomínio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}