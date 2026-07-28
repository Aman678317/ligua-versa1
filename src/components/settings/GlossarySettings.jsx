import React, { useState, useEffect } from 'react';
import { Book, Plus, Trash2, Globe } from 'lucide-react';

export default function GlossarySettings({ user }) {
  const [glossary, setGlossary] = useState([]);
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetLang, setTargetLang] = useState('es');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGlossary = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:3001/api/glossary?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setGlossary(data);
      }
    } catch (err) {
      console.error('Error fetching glossary:', err);
    }
  };

  useEffect(() => {
    fetchGlossary();
  }, [user]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!sourceTerm || !translation) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id || 'default-user',
          source_term: sourceTerm,
          target_lang: targetLang,
          preferred_translation: translation
        })
      });
      if (res.ok) {
        setSourceTerm('');
        setTranslation('');
        fetchGlossary();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/glossary/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchGlossary();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Book className="w-5 h-5 text-indigo-400" /> My Glossary
        </h3>
        <p className="text-sm text-slate-400">Ensure consistency by defining custom translations for jargon or names.</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Source Term</label>
          <input 
            type="text" 
            value={sourceTerm} 
            onChange={e => setSourceTerm(e.target.value)} 
            placeholder="e.g. LinguaVersa" 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Target Lang</label>
          <select 
            value={targetLang} 
            onChange={e => setTargetLang(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Preferred Translation</label>
          <input 
            type="text" 
            value={translation} 
            onChange={e => setTranslation(e.target.value)} 
            placeholder="e.g. LinguaVersa" 
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !sourceTerm || !translation}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="bg-slate-900/30 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Source Term</th>
              <th className="px-4 py-3 font-medium">Language</th>
              <th className="px-4 py-3 font-medium">Translation</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {glossary.map(term => (
              <tr key={term.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{term.source_term}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 uppercase">
                    <Globe className="w-3 h-3" /> {term.target_lang}
                  </span>
                </td>
                <td className="px-4 py-3 text-indigo-300">{term.preferred_translation}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(term.id)} className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {glossary.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-6 text-center text-slate-500 italic">No glossary terms added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
