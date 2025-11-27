/**
 * Logging utility for VaktaAI Dynamic Prompt System
 * Simple structured logging with levels
 */
class Logger {
    level = "info";
    enabled = true;
    setLevel(level) {
        this.level = level;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    shouldLog(level) {
        if (!this.enabled)
            return false;
        const levels = ["debug", "info", "warn", "error"];
        const currentLevelIndex = levels.indexOf(this.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    log(level, message, context) {
        if (!this.shouldLog(level))
            return;
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...context,
        };
        const consoleMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
        consoleMethod(JSON.stringify(logEntry));
    }
    debug(message, context) {
        this.log("debug", message, context);
    }
    info(message, context) {
        this.log("info", message, context);
    }
    warn(message, context) {
        this.log("warn", message, context);
    }
    error(message, context) {
        this.log("error", message, context);
    }
}
export const logger = new Logger();
//# sourceMappingURL=log.js.map