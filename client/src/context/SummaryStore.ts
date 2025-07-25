import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { devtools } from 'zustand/middleware'
import summaryService from '@/services/summaryService'
import {useShallow} from "zustand/react/shallow";

interface File {
    id: string
    name: string
    type: string
    size: number
    uploadedAt: Date
    publicUrl: string
}

interface SummaryResult {
    id: string
    fileId: string
    title: string
    summary: string
    keyPoints: string[]
    flashcards: { question: string; answer: string }[]
    createdAt: Date
    status?: string
    cardCount?: number
    type?: "summary" | "flashcards" | "quiz"
}

interface DocumentMetadata {
    documentId: string
    summaryId: string
    wordCount: number
    createdAt: string
    lastUpdated: string
    title?: string
    tags?: string[]
}

interface SaveStatus {
    status: "idle" | "saving" | "saved" | "error"
    lastSaved: Date | null
    error?: string
}

interface SummaryStore {

    files: File[]
    results: SummaryResult[]
    currentFile: File | null
    currentResult: SummaryResult | null
    isProcessing: boolean
    editorContent: string
    documentMetadata: DocumentMetadata | null
    saveStatus: SaveStatus


    addFile: (file: File) => void
    removeFile: (fileId: string) => void
    setCurrentFile: (file: File | null) => void

    addResult: (result: SummaryResult) => void
    updateResult: (resultId: string, updates: Partial<SummaryResult>) => void
    removeResult: (resultId: string) => void
    setCurrentResult: (result: SummaryResult | null) => void

    setIsProcessing: (isProcessing: boolean) => void

    setEditorContent: (content: string) => void

    setDocumentMetadata: (metadata: DocumentMetadata | null) => void
    updateDocumentMetadata: (updates: Partial<DocumentMetadata>) => void

    saveDocument: (content: string) => Promise<void>
    setSaveStatus: (status: SaveStatus) => void

    reset: () => void
    getFileById: (fileId: string) => File | undefined
    getResultById: (resultId: string) => SummaryResult | undefined
    getResultsByFileId: (fileId: string) => SummaryResult[]
}


const initialState = {
    files: [],
    results: [],
    currentFile: null,
    currentResult: null,
    isProcessing: false,
    editorContent: '',
    documentMetadata: null,
    saveStatus: {
        status: "idle" as const,
        lastSaved: null,
    },
}


export const useSummaryStore = create<SummaryStore>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,


                addFile: (file) => {
                    set((state) => ({
                        files: [...state.files, file]
                    }), false, 'addFile')
                },

                removeFile: (fileId) => {
                    set((state) => ({
                        files: state.files.filter((file) => file.id !== fileId),
                        results: state.results.filter((result) => result.fileId !== fileId),

                        currentFile: state.currentFile?.id === fileId ? null : state.currentFile,
                        currentResult: state.currentResult?.fileId === fileId ? null : state.currentResult,
                    }), false, 'removeFile')
                },

                setCurrentFile: (file) => {
                    set({ currentFile: file }, false, 'setCurrentFile')
                },

                addResult: (result) => {
                    set((state) => {
                        const existingIndex = state.results.findIndex(r => r.id === result.id)

                        if (existingIndex >= 0) {
                            // Update existing result
                            const updatedResults = [...state.results]
                            updatedResults[existingIndex] = {
                                ...updatedResults[existingIndex],
                                ...result
                            }
                            return { results: updatedResults }
                        } else {
                            // Add new result
                            return { results: [...state.results, result] }
                        }
                    }, false, 'addResult')
                },

                updateResult: (resultId, updates) => {
                    set((state) => ({
                        results: state.results.map(result =>
                            result.id === resultId ? { ...result, ...updates } : result
                        )
                    }), false, 'updateResult')
                },

                removeResult: (resultId) => {
                    set((state) => ({
                        results: state.results.filter(result => result.id !== resultId),
                        currentResult: state.currentResult?.id === resultId ? null : state.currentResult,
                    }), false, 'removeResult')
                },

                setCurrentResult: (result) => {
                    set({ currentResult: result }, false, 'setCurrentResult')
                },


                setIsProcessing: (isProcessing) => {
                    set({ isProcessing }, false, 'setIsProcessing')
                },


                setEditorContent: (content) => {
                    set({ editorContent: content }, false, 'setEditorContent')
                },


                setDocumentMetadata: (metadata) => {
                    set({ documentMetadata: metadata }, false, 'setDocumentMetadata')
                },

                updateDocumentMetadata: (updates) => {
                    set((state) => {
                        if (!state.documentMetadata) return state

                        return {
                            documentMetadata: {
                                ...state.documentMetadata,
                                ...updates,
                                lastUpdated: new Date().toISOString()
                            }
                        }
                    }, false, 'updateDocumentMetadata')
                },


                saveDocument: async (content) => {
                    const { documentMetadata, saveStatus } = get()

                    if (!documentMetadata?.summaryId) {
                        set({
                            saveStatus: {
                                status: "error",
                                lastSaved: null,
                                error: "No summary ID found to save"
                            }
                        }, false, 'saveDocument/error')
                        return
                    }

                    try {

                        set({
                            saveStatus: {
                                ...saveStatus,
                                status: "saving"
                            }
                        }, false, 'saveDocument/saving')


                        await summaryService.updateSummary(documentMetadata.summaryId, {
                            summary_content: content,
                            user_id: "current-user-id" // Replace with actual user auth
                        })

                        set({
                            saveStatus: {
                                status: "saved",
                                lastSaved: new Date()
                            }
                        }, false, 'saveDocument/saved')


                        setTimeout(() => {
                            set((state) => ({
                                saveStatus: {
                                    ...state.saveStatus,
                                    status: "idle"
                                }
                            }), false, 'saveDocument/resetToIdle')
                        }, 3000)

                    } catch (error) {
                        console.error("Error saving document:", error)

                        set({
                            saveStatus: {
                                status: "error",
                                lastSaved: saveStatus.lastSaved,
                                error: "Failed to save document"
                            }
                        }, false, 'saveDocument/error')


                        setTimeout(() => {
                            set((state) => ({
                                saveStatus: {
                                    ...state.saveStatus,
                                    status: "idle"
                                }
                            }), false, 'saveDocument/resetToIdle')
                        }, 3000)
                    }
                },

                setSaveStatus: (status) => {
                    set({ saveStatus: status }, false, 'setSaveStatus')
                },


                reset: () => {
                    set({ ...initialState,}, false, 'reset')
                },

                getFileById: (fileId) => {
                    return get().files.find(file => file.id === fileId)
                },

                getResultById: (resultId) => {
                    return get().results.find(result => result.id === resultId)
                },

                getResultsByFileId: (fileId) => {
                    return get().results.filter(result => result.fileId === fileId)
                },
            }),
            {
                name: 'summary-store',
                storage: createJSONStorage(() => localStorage),

                partialize: (state) => ({
                    files: state.files,
                    results: state.results,
                    documentMetadata: state.documentMetadata,
                    editorContent: state.editorContent,
                }),
            }
        ),
        {
            name: 'summary-store',
        },
    )
)


export const useSummarySelectors = {

    useFiles: () => useSummaryStore(useShallow(state => state.files)),
    useCurrentFile: () => useSummaryStore(useShallow(state => state.currentFile)),
    useFileActions: () => useSummaryStore(useShallow(state => ({
        addFile: state.addFile,
        removeFile: state.removeFile,
        setCurrentFile: state.setCurrentFile,
        getFileById: state.getFileById,
    }))),

    useResults: () => useSummaryStore(useShallow(state => state.results)),
    useCurrentResult: () => useSummaryStore(useShallow(state => state.currentResult)),
    useResultActions: () => useSummaryStore(useShallow(state => ({
        addResult: state.addResult,
        updateResult: state.updateResult,
        removeResult: state.removeResult,
        setCurrentResult: state.setCurrentResult,
        getResultById: state.getResultById,
        getResultsByFileId: state.getResultsByFileId,
    }))),

    useProcessing: () => useSummaryStore(useShallow(state => ({
        isProcessing: state.isProcessing,
        setIsProcessing: state.setIsProcessing,
    }))),

    useEditor: () => useSummaryStore(useShallow(state => ({
        editorContent: state.editorContent,
        setEditorContent: state.setEditorContent,
    }))),

    useDocumentMetadata: () => useSummaryStore(useShallow(state => ({
        documentMetadata: state.documentMetadata,
        setDocumentMetadata: state.setDocumentMetadata,
        updateDocumentMetadata: state.updateDocumentMetadata,
    }))),

    useSaveActions: () => useSummaryStore(useShallow(state => ({
        saveDocument: state.saveDocument,
        saveStatus: state.saveStatus,
        setSaveStatus: state.setSaveStatus,
    }))),
}

export default useSummaryStore