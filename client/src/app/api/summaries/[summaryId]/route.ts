// app/api/summaries/[summaryId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { summaryId: string } }
) {
  try {
    const summaryId = params.summaryId;
    const data = await request.json();

    // Your backend API URL
    const apiUrl = `http://localhost:8098/api/v1/summaries/${summaryId}`;

    // Get the user ID from the session or token
    // This is a placeholder - implement your auth logic here
    const userId = "current-user-id"; // Replace with actual auth logic

    const response = await axios.patch(
      apiUrl,
      {
        ...data,
        user_id: userId,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error updating summary:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.response?.data?.detail || "Failed to update summary",
      },
      { status: error.response?.status || 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { summaryId: string } }
) {
  try {
    const summaryId = params.summaryId;

    // In a real application, you would get the userId from your auth system
    // This is a placeholder - implement your actual auth logic
    const userId = "current-user-id";

    const apiUrl = `http://localhost:8098/api/v1/summaries/${summaryId}?user_id=${userId}`;

    // Make request to your backend API
    const response = await axios.get(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        // Add any auth headers if needed
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.response?.data?.detail || "Failed to fetch summary",
      },
      { status: error.response?.status || 500 }
    );
  }
}
