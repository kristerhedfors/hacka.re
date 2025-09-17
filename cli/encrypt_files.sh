#!/bin/bash

# Example: Encrypt/decrypt files using hacka.re's RC4 functions

HACKA_CLI="./hacka.re"

usage() {
    echo "Usage: $0 {encrypt|decrypt} <file> <password>"
    echo
    echo "Examples:"
    echo "  $0 encrypt document.txt mypassword"
    echo "  $0 decrypt document.txt.enc mypassword"
    exit 1
}

if [ $# -ne 3 ]; then
    usage
fi

ACTION=$1
FILE=$2
PASSWORD=$3

case $ACTION in
    encrypt)
        if [ ! -f "$FILE" ]; then
            echo "Error: File '$FILE' not found"
            exit 1
        fi

        # Read file content and convert to hex (for binary safety)
        CONTENT=$(cat "$FILE" | xxd -p | tr -d '\n')

        # Encrypt using hacka.re
        echo "Encrypting $FILE..."
        ENCRYPTED=$($HACKA_CLI function call rc4_encrypt "$(cat "$FILE")" "$PASSWORD")

        # Save encrypted content
        echo "$ENCRYPTED" > "${FILE}.enc"
        echo "Encrypted file saved as: ${FILE}.enc"
        ;;

    decrypt)
        if [ ! -f "$FILE" ]; then
            echo "Error: File '$FILE' not found"
            exit 1
        fi

        # Read encrypted content
        ENCRYPTED=$(cat "$FILE")

        # Decrypt using hacka.re
        echo "Decrypting $FILE..."
        DECRYPTED=$($HACKA_CLI function call rc4_decrypt "$ENCRYPTED" "$PASSWORD")

        # Save decrypted content
        OUTPUT_FILE="${FILE%.enc}"
        if [ "$OUTPUT_FILE" = "$FILE" ]; then
            OUTPUT_FILE="${FILE}.dec"
        fi
        echo "$DECRYPTED" > "$OUTPUT_FILE"
        echo "Decrypted file saved as: $OUTPUT_FILE"
        ;;

    *)
        usage
        ;;
esac