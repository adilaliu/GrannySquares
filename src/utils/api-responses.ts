import { NextResponse } from "next/server";

/**
 * Standard API response formats for consistency across all endpoints
 */

export function successResponse(data?: any, status: number = 200) {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
}

export function successResponseWithMessage(
  message: string,
  status: number = 200,
) {
  return NextResponse.json({
    success: true,
    message,
  }, { status });
}

export function errorResponse(error: string, status: number = 500) {
  return NextResponse.json({
    success: false,
    error,
  }, { status });
}

export function authenticationRequiredResponse() {
  return errorResponse("Authentication required", 401);
}

export function notFoundResponse(resource: string = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function forbiddenResponse(message: string = "Access denied") {
  return errorResponse(message, 403);
}

export function badRequestResponse(message: string) {
  return errorResponse(message, 400);
}

export function paginatedResponse(data: any[], pagination: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  return NextResponse.json({
    success: true,
    data,
    pagination,
  });
}
