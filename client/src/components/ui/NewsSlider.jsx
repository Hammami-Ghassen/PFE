import React, { useState, useEffect } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { getNews } from '../../services/newsService';

const NewsSlider = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getNews(axiosPrivate);
        if (response.success) {
          setNews(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch news', err);
        setError('Impossible de charger les actualités pour le moment.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [axiosPrivate]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 h-64 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ministere-600 mb-4"></div>
        <p className="text-gray-500">Chargement des actualités...</p>
      </div>
    );
  }

  if (error || news.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 h-64 flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
        <p className="text-gray-500">{error || "Aucune actualité disponible."}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 flex flex-col h-full">
      <h2 className="text-xl font-bold text-gray-900 mb-4 shrink-0">Actualités du Ministère</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
        {news.map((item, index) => (
          <a filter="noopener noreferrer" 
            key={index} 
            href={item.link} 
            target="_blank" 
            rel="noreferrer"
            className="flex flex-col border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {item.imageUrl && (
              <div className="h-32 w-full bg-gray-100 shrink-0">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3 flex-1 flex flex-col">
              <p className="text-xs text-gray-500 mb-1">{item.date}</p>
              <h3 className="text-sm font-semibold text-ministere-800 line-clamp-2">{item.title}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsSlider;
