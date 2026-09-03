import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { getEdgeFunctionName } from '../../utils/edgeFunctionConfig';

export { projectId, publicAnonKey };

const PLACEHOLDER_EDGE_FUNCTION_MARKERS = [
  'your-edge-function-name',
  'your-edge-function',
  'your-function',
  'replace-with',
  'replace_with',
  'example',
];

function isPlaceholderEdgeFunctionName(value: string | undefined): boolean {
  if (!value) {return true;}
  const normalized = value.trim().toLowerCase();
  if (!normalized) {return true;}
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {return true;}
  return PLACEHOLDER_EDGE_FUNCTION_MARKERS.some(marker => normalized.includes(marker));
}

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const configuredFunctionsBaseUrl = (
  import.meta.env.VITE_EDGE_FUNCTIONS_BASE_URL as string | undefined
)?.trim();
const rawConfiguredFunctionName = (
  import.meta.env.VITE_EDGE_FUNCTION_NAME as string | undefined
)?.trim();
const configuredFunctionName = isPlaceholderEdgeFunctionName(rawConfiguredFunctionName)
  ? ''
  : rawConfiguredFunctionName;
const defaultFunctionsBaseUrl = projectId ? `https://${projectId}.supabase.co/functions/v1` : '';
const resolvedFunctionsBaseUrl = configuredFunctionsBaseUrl || defaultFunctionsBaseUrl;
const resolvedFunctionName = configuredFunctionName || getEdgeFunctionName();

export const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '')
  : resolvedFunctionsBaseUrl
    ? `${resolvedFunctionsBaseUrl.replace(/\/$/, '')}/${resolvedFunctionName}`
    : '';
