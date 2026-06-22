import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://kahiwxtzxfsqyggwaygi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_afbX2f3CwBp2F8U709az_g_OldCZZ3O';

export default function ProdeApp() {
  const [view, setView] = useState('form');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [pronósticos, setPronósticos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    apodo: '',
    fecha: '',
    hora: '',
    peso: '',
    parto: '',
  });

  const [resultados, setResultados] = useState({
    fechaReal: '',
    horaReal: '',
    pesoReal: '',
    partoReal: '',
  });

  const [ranking, setRanking] = useState([]);
  const [resultadosCalculados, setResultadosCalculados] = useState(false);

  useEffect(() => {
    fetchPronósticos();
    const interval = setInterval(fetchPronósticos, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchPronósticos = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/pronósticos?select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setPronósticos(data);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPronostico = async (e) => {
    e.preventDefault();

    if (!formData.apodo || !formData.fecha || !formData.hora || !formData.peso || !formData.parto) {
      setError('Completá todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    // Verificar si ya existe un pronóstico con este apodo
    const yaExiste = pronósticos.some(p => p.apodo.toLowerCase() === formData.apodo.trim().toLowerCase());
    if (yaExiste) {
      setError('⚠️ Ya hay un pronóstico registrado con este apodo. No se puede cambiar.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        apodo: formData.apodo.trim(),
        fecha: formData.fecha,
        hora: formData.hora,
        peso: parseFloat(formData.peso),
        parto: formData.parto,
      };

      console.log('Enviando:', payload);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/pronósticos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('Status:', response.status);
      const responseText = await response.text();
      console.log('Response:', responseText);
      
      if (response.ok || response.status === 201 || response.status === 200) {
        setFormData({ apodo: '', fecha: '', hora: '', peso: '', parto: '' });
        setError('✓ ¡Pronóstico guardado!');
        setTimeout(() => setError(''), 3000);
        setTimeout(() => fetchPronósticos(), 500);
      } else {
        setError('Error ' + response.status + ': ' + responseText);
      }
    } catch (err) {
      console.error('Error completo:', err);
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuth = (password) => {
    if (password === 'admin123') {
      setIsAdminAuth(true);
      setAdminPassword('');
    } else {
      setError('Contraseña incorrecta');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResultadosChange = (e) => {
    const { name, value } = e.target;
    setResultados(prev => ({ ...prev, [name]: value }));
  };

  const calcularPuntos = (pronóstico) => {
    let puntos = 0;

    // Comparar fechas en formato YYYY-MM-DD
    const fechaIgual = pronóstico.fecha === resultados.fechaReal;

    const [horaP, minP] = pronóstico.hora.split(':').map(Number);
    const [horaR, minR] = resultados.horaReal.split(':').map(Number);
    const minutosDiff = Math.abs((horaP * 60 + minP) - (horaR * 60 + minR));
    const horaEnRango = minutosDiff <= 180;

    if (fechaIgual && horaEnRango) {
      puntos += 70;
    } else if (fechaIgual) {
      puntos += 30;
    } else if (horaEnRango) {
      puntos += 20;
    }

    const pesoP = parseFloat(pronóstico.peso);
    const pesoR = parseFloat(resultados.pesoReal);
    if (Math.abs(pesoP - pesoR) <= 0.5) {
      puntos += 50;
    }

    if (pronóstico.parto === resultados.partoReal) {
      puntos += 20;
    }

    return puntos;
  };

  const handleCalcularResultados = () => {
    if (!resultados.fechaReal || !resultados.horaReal || !resultados.pesoReal || !resultados.partoReal) {
      setError('Completá todos los datos reales');
      return;
    }

    const ranking = pronósticos.map(p => ({
      ...p,
      puntos: calcularPuntos(p),
    })).sort((a, b) => b.puntos - a.puntos);

    setRanking(ranking);
    setResultadosCalculados(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🍼 Prode del Bebé</h1>
        <p style={styles.subtitle}>¿Cuándo llega?</p>
      </div>

      <div style={styles.nav}>
        <button
          onClick={() => { setView('form'); setIsAdminAuth(false); }}
          style={{ ...styles.navBtn, ...(view === 'form' ? styles.navBtnActive : {}) }}
        >
          Hacer pronóstico
        </button>
        <button
          onClick={() => { setView('leaderboard'); setIsAdminAuth(false); }}
          style={{ ...styles.navBtn, ...(view === 'leaderboard' ? styles.navBtnActive : {}) }}
        >
          Ver apuestas
        </button>
        <button
          onClick={() => setView('admin')}
          style={{ ...styles.navBtn, ...(view === 'admin' ? styles.navBtnActive : {}) }}
        >
          Admin
        </button>
      </div>

      {error && (
        <div style={styles.message}>
          {error}
        </div>
      )}

      {view === 'form' && (
        <div style={styles.section}>
          <div style={styles.disclaimer}>
            ⚠️ <strong>Importante:</strong> Una vez que enviás tu pronóstico, no se puede cambiar. Verificá que todo esté correcto antes de hacer click.
          </div>
          <form onSubmit={handleSubmitPronostico} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tu apodo</label>
              <input
                type="text"
                name="apodo"
                value={formData.apodo}
                onChange={handleFormChange}
                placeholder="ej: Tía Marta"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Fecha de nacimiento</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const [year, month, day] = value.split('-');
                    setFormData(prev => ({ ...prev, fecha: `2026-${month}-${day}` }));
                  }
                }}
                min="2026-01-01"
                max="2026-12-31"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Hora de nacimiento</label>
              <input
                type="time"
                name="hora"
                value={formData.hora}
                onChange={handleFormChange}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Peso (kg)</label>
              <input
                type="number"
                name="peso"
                value={formData.peso}
                onChange={handleFormChange}
                placeholder="ej: 3.5"
                step="0.1"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de parto</label>
              <select
                name="parto"
                value={formData.parto}
                onChange={handleFormChange}
                style={styles.input}
              >
                <option value="">-- Selecciona --</option>
                <option value="natural">Natural</option>
                <option value="cesárea">Cesárea</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{...styles.submitBtn, opacity: loading ? 0.7 : 1}}
            >
              {loading ? 'Guardando...' : '✓ Enviar pronóstico'}
            </button>
          </form>
        </div>
      )}

      {view === 'leaderboard' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Pronósticos hasta ahora</h2>
          {pronósticos.length === 0 ? (
            <p style={styles.empty}>Aún no hay pronósticos</p>
          ) : (
            <div style={styles.pronósticosList}>
              {pronósticos.map((p, idx) => (
                <div key={idx} style={styles.pronósticoCard}>
                  <div style={styles.cardRow}>
                    <span style={styles.label}>Fecha:</span>
                    <span>{p.fecha}</span>
                  </div>
                  <div style={styles.cardRow}>
                    <span style={styles.label}>Hora:</span>
                    <span>{p.hora}</span>
                  </div>
                  <div style={styles.cardRow}>
                    <span style={styles.label}>Peso:</span>
                    <span>{p.peso} kg</span>
                  </div>
                  <div style={styles.cardRow}>
                    <span style={styles.label}>Parto:</span>
                    <span>{p.parto}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'admin' && (
        <div style={styles.section}>
          {!isAdminAuth ? (
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contraseña admin</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Ingresá la contraseña"
                  style={styles.input}
                />
              </div>
              <button
                onClick={() => handleAdminAuth(adminPassword)}
                style={styles.submitBtn}
              >
                Entrar
              </button>
            </div>
          ) : resultadosCalculados ? (
            <div>
              <h2 style={styles.sectionTitle}>🏆 Resultados finales</h2>
              <div style={styles.resultsInfo}>
                <p><strong>Fecha real:</strong> {resultados.fechaReal}</p>
                <p><strong>Hora real:</strong> {resultados.horaReal}</p>
                <p><strong>Peso real:</strong> {resultados.pesoReal} kg</p>
                <p><strong>Parto:</strong> {resultados.partoReal}</p>
              </div>
              <div style={styles.rankingContainer}>
                {ranking.length === 0 ? (
                  <p style={styles.empty}>Sin pronósticos</p>
                ) : (
                  ranking.map((p, idx) => (
                    <div key={idx} style={styles.rankingItem}>
                      <span style={styles.podium}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                      </span>
                      <span style={styles.rankingName}>{p.apodo}</span>
                      <span style={styles.rankingPoints}>{p.puntos} pts</span>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setResultadosCalculados(false);
                  setResultados({ fechaReal: '', horaReal: '', pesoReal: '', partoReal: '' });
                }}
                style={{ ...styles.submitBtn, marginTop: '20px' }}
              >
                Recalcular
              </button>
            </div>
          ) : (
            <div>
              <h2 style={styles.sectionTitle}>Ingresá los datos reales</h2>
              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={resultados.fechaReal}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const [year, month, day] = value.split('-');
                        setResultados(prev => ({ ...prev, fechaReal: `2026-${month}-${day}` }));
                      }
                    }}
                    min="2026-01-01"
                    max="2026-12-31"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Hora</label>
                  <input
                    type="time"
                    value={resultados.horaReal}
                    onChange={handleResultadosChange}
                    name="horaReal"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Peso (kg)</label>
                  <input
                    type="number"
                    name="pesoReal"
                    value={resultados.pesoReal}
                    onChange={handleResultadosChange}
                    placeholder="ej: 3.5"
                    step="0.1"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de parto</label>
                  <select
                    name="partoReal"
                    value={resultados.partoReal}
                    onChange={handleResultadosChange}
                    style={styles.input}
                  >
                    <option value="">-- Selecciona --</option>
                    <option value="natural">Natural</option>
                    <option value="cesárea">Cesárea</option>
                  </select>
                </div>

                <button
                  onClick={handleCalcularResultados}
                  style={styles.submitBtn}
                >
                  📊 Calcular resultados
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#faf8f3',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#2c2416',
  },
  header: {
    backgroundColor: '#c9a574',
    padding: '40px 20px',
    textAlign: 'center',
    color: '#fff',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '32px',
  },
  subtitle: {
    margin: '0',
    fontSize: '16px',
    opacity: 0.9,
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    padding: '20px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0d5c7',
    flexWrap: 'wrap',
  },
  navBtn: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: '#f0ebe3',
    color: '#2c2416',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s',
  },
  navBtnActive: {
    backgroundColor: '#c9a574',
    color: '#fff',
  },
  section: {
    maxWidth: '600px',
    margin: '30px auto',
    padding: '30px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    marginTop: '0',
    marginBottom: '20px',
    fontSize: '22px',
    color: '#c9a574',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  dateInputGroup: {
    display: 'flex',
    gap: '10px',
  },
  label: {
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#2c2416',
  },
  input: {
    padding: '12px',
    border: '1px solid #d4c5b9',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#2c2416',
    backgroundColor: '#faf8f3',
  },
  submitBtn: {
    padding: '14px',
    backgroundColor: '#c9a574',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '10px',
  },
  message: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '15px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '6px',
    textAlign: 'center',
  },
  disclaimer: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    color: '#856404',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  pronósticosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  pronósticoCard: {
    padding: '15px',
    backgroundColor: '#faf8f3',
    borderRadius: '8px',
    border: '1px solid #e0d5c7',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    color: '#8b7d6b',
    fontStyle: 'italic',
  },
  resultsInfo: {
    backgroundColor: '#faf8f3',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  rankingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rankingItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: '#faf8f3',
    borderRadius: '8px',
    border: '1px solid #e0d5c7',
    gap: '15px',
  },
  podium: {
    fontSize: '20px',
    minWidth: '30px',
  },
  rankingName: {
    flex: 1,
    fontWeight: '600',
  },
  rankingPoints: {
    backgroundColor: '#c9a574',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
  },
};
