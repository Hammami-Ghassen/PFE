import { useCallback, useEffect, useRef, useState } from 'react';

const defaultData = { content: [], totalPages: 0, totalElements: 0 };

export const buildPageWindow = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages = new Set([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 0 && page < totalPages)
    .sort((a, b) => a - b);
};

// Encapsulates list pagination/search/filter state with in-flight request deduplication.
const usePersonnelPagination = (fetchUsers, pageSize = 50) => {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [codSoc, setCodSoc] = useState('');

  const requestSeqRef = useRef(0);

  const fetchPersonnel = useCallback(() => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);

    fetchUsers({ page, size: pageSize, search, codSoc })
      .then((personnelPage) => {
        if (requestSeq !== requestSeqRef.current) {
          return;
        }
        setData(personnelPage);
        if (personnelPage.totalPages > 0 && page >= personnelPage.totalPages) {
          setPage(personnelPage.totalPages - 1);
        }
      })
      .catch(() => {
        // Error toasts are handled by caller-provided fetchUsers; hook keeps state cleanup centralized.
      })
      .finally(() => {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      });
  }, [codSoc, fetchUsers, page, pageSize, search]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const normalizedSearch = searchInput.trim();
      if (normalizedSearch !== search) {
        setPage(0);
        setSearch(normalizedSearch);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [search, searchInput]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const selectEstablishment = (value) => {
    setCodSoc(value);
    setPage(0);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setCodSoc('');
    setPage(0);
  };

  return {
    data,
    loading,
    page,
    searchInput,
    codSoc,
    setPage,
    setSearchInput,
    submitSearch,
    selectEstablishment,
    resetFilters,
    refresh: fetchPersonnel,
  };
};

export default usePersonnelPagination;
