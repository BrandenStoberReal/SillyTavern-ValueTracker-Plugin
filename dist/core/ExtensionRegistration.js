"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCrossExtensionReader = exports.setCrossExtensionReader = void 0;
// Singleton instance of the CrossExtensionReader
let crossExtensionReader;
// Export methods for other parts of the plugin
function setCrossExtensionReader(reader) {
    crossExtensionReader = reader;
}
exports.setCrossExtensionReader = setCrossExtensionReader;
function getCrossExtensionReader() {
    if (!crossExtensionReader) {
        throw new Error('CrossExtensionReader not initialized. Call setCrossExtensionReader first.');
    }
    return crossExtensionReader;
}
exports.getCrossExtensionReader = getCrossExtensionReader;
//# sourceMappingURL=ExtensionRegistration.js.map