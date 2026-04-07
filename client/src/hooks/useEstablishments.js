import { useEffect, useRef, useState } from 'react';

// Loads establishments once per mount and keeps retry behavior explicit on fetch failures.
const useEstablishments = (loadEstablishments) => {
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) {
      return;
    }

    loadedRef.current = true;
    setLoading(true);
    loadEstablishments()
      .then((items) => {
        setEstablishments(items);
        setError(null);
      })
      .catch((err) => {
        loadedRef.current = false;
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [loadEstablishments]);

  return { establishments, loading, error };
};

export default useEstablishments;
