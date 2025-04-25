#!/bin/bash
# Script to create a clean hacka.re.zip file with only HTML, JS, CSS, and fonts
# Usage: ./create-hacka-re-zip.sh

# Exit on error
set -e

echo "Creating hacka.re.zip distribution file..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Copy only the necessary files
echo "Copying essential files..."
cp -r *.html $TEMP_DIR/
cp -r css/ $TEMP_DIR/
cp -r js/ $TEMP_DIR/
cp -r lib/ $TEMP_DIR/
cp -r about/ $TEMP_DIR/

# Remove any unnecessary files
echo "Cleaning up unnecessary files..."
find $TEMP_DIR -name ".git*" -delete
find $TEMP_DIR -name ".DS_Store" -delete
find $TEMP_DIR -name "*.map" -delete
find $TEMP_DIR -name "_tests" -type d -exec rm -rf {} +
find $TEMP_DIR -name "node_modules" -type d -exec rm -rf {} +

# Create the zip file
echo "Creating zip file..."
pushd .
cd $TEMP_DIR
zip -r hacka.re.zip ./*
popd
cp ${TEMP_DIR}/hacka.re.zip .

# Clean up
echo "Cleaning up temporary directory..."
rm -rf $TEMP_DIR

echo "✅ Successfully created hacka.re.zip with only HTML, JS, CSS, and font files"
echo "Location: $(pwd)/hacka.re.zip"
