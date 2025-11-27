/**
 * Logging utility for VaktaAI Dynamic Prompt System
 * Simple structured logging with levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext {
    [key: string]: any;
}
declare class Logger {
    private level;
    private enabled;
    setLevel(level: LogLevel): void;
    setEnabled(enabled: boolean): void;
    private shouldLog;
    private log;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=log.d.ts.map