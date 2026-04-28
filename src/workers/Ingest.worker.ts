/// <reference lib="webworker" />

type IngestMessage = {
  type: 'START_INGEST';
  payload: {
    file: File;
    req_id: string;
    operation_id: string;
    context_name: string;
    ws_id: string;
    settings: any;
    server: string;
    token: string;
    frame?: { min: number; max: number };
    chunkSize?: number;
    endpoint?: 'ingest_file' | 'ingest_zip';
  };
};

const DEFAULT_CHUNK_SIZE = 1024 * 1024 * 8; // 8MB

self.onmessage = async (event: MessageEvent<IngestMessage>) => {
  const { type, payload } = event.data;

  if (type !== 'START_INGEST') return;

  const { file, req_id, operation_id, context_name, ws_id, settings, server, token, frame, chunkSize = DEFAULT_CHUNK_SIZE, endpoint = 'ingest_file' } = payload;

  try {
    if (endpoint === 'ingest_zip') {
      const formData = new FormData();
      const ingestPayload: any = {
        original_file_path: file.name,
        offset: 0,
      };
      if (frame) {
        ingestPayload.flt = { time_range: [frame.min, frame.max] };
      }
      formData.append("payload", new Blob([JSON.stringify(ingestPayload)], { type: "application/json" }));
      formData.append("f", file, file.name);

      const query = new URLSearchParams({
        operation_id,
        context_name,
        ws_id,
        req_id,
      });

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          self.postMessage({ type: 'PROGRESS', payload: { req_id, progress, bytes: event.loaded, total: event.total } });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          self.postMessage({ type: 'DONE', payload: { req_id } });
        } else {
          self.postMessage({ type: 'ERROR', payload: { req_id, message: xhr.statusText } });
        }
      });

      xhr.addEventListener('error', () => {
        self.postMessage({ type: 'ERROR', payload: { req_id, message: 'Upload failed' } });
      });

      xhr.open('POST', `${server}/ingest_zip?${query.toString()}`);
      xhr.setRequestHeader('token', token);
      xhr.setRequestHeader('size', file.size.toString());
      xhr.send(formData);
      return;
    }

    const ingest = async (start = 0, current_req_id?: string): Promise<void> => {
      const end = Math.min(file.size, start + chunkSize);
      const formData = new FormData();

      const ingestPayload: any = {
        original_file_path: file.name,
        offset: settings.offset ?? 0,
      };

      const pluginParams: any = {};
      if (settings.custom_parameters) pluginParams.custom_parameters = settings.custom_parameters;

      const mappingParameters: any = {};
      if (settings.method) mappingParameters.mapping_file = settings.method;
      if (settings.mapping) mappingParameters.mapping_id = settings.mapping;
      if (settings.additional_mapping_files) mappingParameters.additional_mapping_files = settings.additional_mapping_files;

      if (Object.keys(mappingParameters).length > 0) {
        pluginParams.mapping_parameters = mappingParameters;
      }

      if (settings.store_file !== undefined) pluginParams.store_file = settings.store_file;
      if (Object.keys(pluginParams).length > 0) ingestPayload.plugin_params = pluginParams;

      if (frame) {
        ingestPayload.flt = { int_filter: [frame.min, frame.max] };
      }

      formData.append("payload", new Blob([JSON.stringify(ingestPayload)], { type: "application/json" }));
      formData.append("f", file.slice(start, end), file.name);

      const query = new URLSearchParams({
        plugin: settings.plugin.split(".")[0],
        operation_id,
        context_name,
        ws_id,
        req_id: current_req_id || req_id,
      });

      const response = await fetch(`${server}/ingest_file?${query}`, {
        method: "POST",
        body: formData,
        headers: {
          token,
          size: file.size.toString(),
          continue_offset: start.toString(),
        },
      });

      if (!response.ok) {
        throw new Error(`Ingestion failed with status ${response.status}`);
      }

      const data = await response.json();
      const nextOffset = data?.data?.continue_offset;

      // Report progress
      const progress = Math.round((end / file.size) * 100);
      self.postMessage({ type: 'PROGRESS', payload: { req_id, progress, bytes: end, total: file.size } });

      if (nextOffset !== undefined && nextOffset !== null && end < file.size) {
        return ingest(nextOffset, data.req_id || current_req_id || req_id);
      }
    };

    await ingest();
    self.postMessage({ type: 'DONE', payload: { req_id } });

  } catch (error: any) {
    self.postMessage({ type: 'ERROR', payload: { req_id, message: error.message } });
  }
};
