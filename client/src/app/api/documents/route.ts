// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Document } from "@/lib/documents";
import { parseForm } from "@/utils/documentUtils";

// Mock user ID (in a real app, would come from auth)
const MOCK_USER_ID = "5";

// Mock database (in-memory storage for demo purposes)
const mockDocuments: Document[] = [];

// GET /api/documents - Get all documents for current user
export async function GET(req: NextRequest) {
  try {
    // In a real app, would filter by authenticated user ID
    // const session = await getSession(req);
    // const userId = session?.user?.id;
    const userDocuments = mockDocuments.filter(
      (doc) => doc.userId === MOCK_USER_ID
    );

    return NextResponse.json(userDocuments);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { message: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/documents - Upload a new document
export async function POST(req: NextRequest) {
  try {
    const { fields, files } = await parseForm(req);
    const file = files.file;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Parse metadata if provided
    let metadata = null;
    if (fields.metadata) {
      try {
        metadata = JSON.parse(fields.metadata as string);
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }

    // Generate UUID for file name
    const timestamp = new Date().toISOString().replace("", "").substring(0, 14);
    const random = Math.random().toString(36).substring(2, 10);
    const fileName = `${timestamp}-${random}.${file.originalFilename
      ?.split(".")
      .pop()}`;

    // In a real app, would upload to cloud storage (AWS S3, Azure Blob, etc.)
    // For this example, simulating with in-memory storage

    // Add document to mock database
    const newDocument: Document = {
      id: Date.now(), // Use timestamp as ID
      fileName: fileName,
      userName: "rajp", // In a real app, would use authenticated user's name
      userId: MOCK_USER_ID,
      originalFileName: file.originalFilename || fileName,
      contentType: file.mimetype || "application/octet-stream",
      fileSize: file.size,
      publicUrl: `https://studysync.blob.core.windows.net/documents/${fileName}`,
      pageCount: 1, // Would be determined by file type analysis
      fileExtension: file.originalFilename?.split(".").pop() || "",
      metadata: metadata ? JSON.stringify(metadata) : null,
      uploadDateTime: new Date().toISOString(),
      lastAccessDateTime: null,
    };

    mockDocuments.push(newDocument);

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { message: "Failed to upload document" },
      { status: 500 }
    );
  }
}
