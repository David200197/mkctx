#!/bin/bash
# build.sh - Script de compilación para Linux/macOS

echo "🔨 Building mkctx for all platforms..."

# Crear estructura de directorios
platforms=("win32" "darwin" "linux")
archs=("x64" "arm64")

for platform in "${platforms[@]}"; do
    for arch in "${archs[@]}"; do
        mkdir -p "bin/$platform/$arch"
    done
done

# Compilar para cada plataforma
echo "Building for Windows x64..."
GOOS=windows GOARCH=amd64 go build -o bin/win32/x64/mkctx.exe main.go

echo "Building for Windows ARM64..."
GOOS=windows GOARCH=arm64 go build -o bin/win32/arm64/mkctx.exe main.go

echo "Building for macOS x64..."
GOOS=darwin GOARCH=amd64 go build -o bin/darwin/x64/mkctx main.go

echo "Building for macOS ARM64..."
GOOS=darwin GOARCH=arm64 go build -o bin/darwin/arm64/mkctx main.go

echo "Building for Linux x64..."
GOOS=linux GOARCH=amd64 go build -o bin/linux/x64/mkctx main.go

echo "Building for Linux ARM64..."
GOOS=linux GOARCH=arm64 go build -o bin/linux/arm64/mkctx main.go

echo "✅ Build completed!"

# Verificar archivos creados
echo "📁 Files created:"
find bin/ -type f | while read file; do
    echo "   - $file"
done