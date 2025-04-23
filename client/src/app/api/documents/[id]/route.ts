// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Document } from "@/lib/documents";

// Mock user ID (in a real app, would come from auth)
const MOCK_USER_ID = "5";

// Mock database reference (would be shared with the main documents API in a real app)
// For simplicity, we're declaring it here as well
const mockDocuments: Document[] = [];

// GET /api/documents/[id] - Get a document by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { message: "Invalid document ID" },
        { status: 400 }
      );
    }

    const document = mockDocuments.find(
      (doc) => doc.id === documentId && doc.userId === MOCK_USER_ID
    );

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Update last access time
    document.lastAccessDateTime = new Date().toISOString();

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { message: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update a document
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { message: "Invalid document ID" },
        { status: 400 }
      );
    }

    const documentIndex = mockDocuments.findIndex(
      (doc) => doc.id === documentId && doc.userId === MOCK_USER_ID
    );

    if (documentIndex === -1) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Get updatable fields from request body
    const body = await req.json();
    const { originalFileName, metadata } = body;
    const updatedDocument = { ...mockDocuments[documentIndex] };

    // Update only allowed fields
    if (originalFileName) {
      updatedDocument.originalFileName = originalFileName;
    }

    if (metadata !== undefined) {
      updatedDocument.metadata =
        typeof metadata === "string" ? metadata : JSON.stringify(metadata);
    }

    // Update in mock database
    mockDocuments[documentIndex] = updatedDocument;

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { message: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId)) {
      return NextResponse.json(
        { message: "Invalid document ID" },
        { status: 400 }
      );
    }

    const documentIndex = mockDocuments.findIndex(
      (doc) => doc.id === documentId && doc.userId === MOCK_USER_ID
    );

    if (documentIndex === -1) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Remove from mock database
    mockDocuments.splice(documentIndex, 1);

    // In a real app, would also delete from cloud storage

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { message: "Failed to delete document" },
      { status: 500 }
    );
  }
}
