import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas
export const getDurationTrend = new Trend('GET_Duration', true);
export const rateStatusOK = new Rate('Rate_Status_OK');

// Configurações do Teste
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
    GET_Duration: ['p(95)<5700'],
    Rate_Status_OK: ['rate>0.95']
  },
  stages: [
    { duration: '60s', target: 10 },
    { duration: '60s', target: 160 },
    { duration: '120s', target: 300 }
  ]
};

// Relatórios
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função Principal
export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Teste GET 1: Hora Atual por Zona de Tempo
  const zoneUrl =
    'https://www.timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo';
  const zoneRes = http.get(zoneUrl, params);
  getDurationTrend.add(zoneRes.timings.duration);
  rateStatusOK.add(zoneRes.status === OK);
  check(zoneRes, {
    'GET Time (Zona) - Status 200': () => zoneRes.status === OK,
    'GET Time (Zona) - Resposta contém timezone': () =>
      JSON.parse(zoneRes.body).timeZone === 'America/Sao_Paulo'
  });

  // Teste GET 2: Hora Atual por Latitude e Longitude
  const coordUrl =
    'https://www.timeapi.io/api/Time/current/coordinate?latitude=-23.55052&longitude=-46.633308';
  const coordRes = http.get(coordUrl, params);
  getDurationTrend.add(coordRes.timings.duration);
  rateStatusOK.add(coordRes.status === OK);
  check(coordRes, {
    'GET Time (Coordenadas) - Status 200': () => coordRes.status === OK,
    'GET Time (Coordenadas) - Resposta contém timezone': () =>
      JSON.parse(coordRes.body).timeZone === 'America/Sao_Paulo'
  });

  // Teste GET 3: Hora Atual do Sistema
  const systemTimeUrl = 'https://www.timeapi.io/api/Time/current/system';
  const systemTimeRes = http.get(systemTimeUrl, params);
  getDurationTrend.add(systemTimeRes.timings.duration);
  rateStatusOK.add(systemTimeRes.status === OK);
  check(systemTimeRes, {
    'GET Time (Sistema) - Status 200': () => systemTimeRes.status === OK,
    'GET Time (Sistema) - Resposta contém horário': () =>
      JSON.parse(systemTimeRes.body).currentLocalTime !== undefined
  });

  // Teste GET 4: Endpoint Inválido
  const invalidUrl = 'https://www.timeapi.io/api/Time/invalid';
  const invalidRes = http.get(invalidUrl, params);
  getDurationTrend.add(invalidRes.timings.duration);
  rateStatusOK.add(invalidRes.status === 404);
  check(invalidRes, {
    'GET Invalid - Status 404': () => invalidRes.status === 404
  });

  if (invalidRes.body) {
    try {
      const responseBody = JSON.parse(invalidRes.body);
      check(responseBody, {
        'GET Invalid - Resposta contém mensagem de erro': () =>
          responseBody.message !== undefined
      });
    } catch (e) {
      console.error('GET Invalid - Erro ao analisar JSON:', e.message);
      console.error('GET Invalid - Corpo da resposta:', invalidRes.body);
    }
  } else {
    console.error('GET Invalid - Corpo da resposta está vazio.');
  }
}
