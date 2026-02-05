export interface UploadFile {
    path: string;
    table: string;
}

export interface ProcessFileResult {
    stdout: string;
    stderr: string;
}

export interface LoadStatusFileResponse {
    file: string;
    status: string;
}
