#!/bin/bash

# AI Screen Helper - Latest Release Installer
# Automatically downloads and installs the latest .deb package from GitHub

set -e  # Exit on any error

REPO="eyalev/ai-screen-helper"
PACKAGE_NAME="ai-screen-helper"
TEMP_DIR="/tmp/ai-screen-helper-install"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get installed version
get_installed_version() {
    if dpkg -l | grep -q "^ii.*${PACKAGE_NAME}"; then
        dpkg -l | grep "^ii.*${PACKAGE_NAME}" | awk '{print $3}' | head -1
    else
        echo "none"
    fi
}

# Function to compare versions
version_gt() {
    test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1"
}

# Check if running as root for installation
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script needs sudo privileges to install the .deb package"
        print_status "Please run: sudo $0"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    local deps=("curl" "jq")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_status "Please install them first:"
        print_status "Ubuntu/Debian: sudo apt update && sudo apt install ${missing_deps[*]}"
        exit 1
    fi
}

# Main installation function
main() {
    print_status "AI Screen Helper - Latest Release Installer"
    echo
    
    # Check if we have sudo when not running as root
    if [ "$EUID" -ne 0 ]; then
        print_status "Checking sudo access..."
        if ! sudo -n true 2>/dev/null; then
            print_status "This script will need sudo access to install the package"
            sudo -v || {
                print_error "Sudo access required for installation"
                exit 1
            }
        fi
    fi
    
    # Check dependencies
    print_status "Checking dependencies..."
    check_dependencies
    
    # Get current installed version
    print_status "Checking installed version..."
    INSTALLED_VERSION=$(get_installed_version)
    if [ "$INSTALLED_VERSION" = "none" ]; then
        print_status "AI Screen Helper is not currently installed"
    else
        print_status "Currently installed version: $INSTALLED_VERSION"
    fi
    
    # Get latest release information
    print_status "Fetching latest release information..."
    RELEASE_INFO=$(curl -s "$GITHUB_API")
    
    if [ $? -ne 0 ]; then
        print_error "Failed to fetch release information from GitHub"
        exit 1
    fi
    
    LATEST_VERSION=$(echo "$RELEASE_INFO" | jq -r '.tag_name' | sed 's/^v//')
    
    if [ "$LATEST_VERSION" = "null" ] || [ -z "$LATEST_VERSION" ]; then
        print_error "Could not determine latest version"
        exit 1
    fi
    
    print_status "Latest available version: $LATEST_VERSION"
    
    # Compare versions
    if [ "$INSTALLED_VERSION" != "none" ]; then
        if [ "$INSTALLED_VERSION" = "$LATEST_VERSION" ]; then
            echo
            print_warning "The latest version ($LATEST_VERSION) is already installed!"
            read -p "Do you want to reinstall it anyway? [y/N]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_status "Installation cancelled by user"
                exit 0
            fi
        elif version_gt "$INSTALLED_VERSION" "$LATEST_VERSION"; then
            echo
            print_warning "You have a newer version ($INSTALLED_VERSION) than the latest release ($LATEST_VERSION)"
            read -p "Do you want to downgrade to $LATEST_VERSION? [y/N]: " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_status "Installation cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Get download URL
    DEB_URL=$(echo "$RELEASE_INFO" | jq -r '.assets[] | select(.name | endswith(".deb")) | .browser_download_url')
    
    if [ -z "$DEB_URL" ] || [ "$DEB_URL" = "null" ]; then
        print_error "Could not find .deb file in latest release"
        exit 1
    fi
    
    DEB_FILENAME=$(basename "$DEB_URL")
    print_status "Found package: $DEB_FILENAME"
    
    # Create temp directory
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # Download the .deb file
    print_status "Downloading $DEB_FILENAME..."
    if curl -L -o "$DEB_FILENAME" "$DEB_URL" --progress-bar; then
        print_success "Download completed"
    else
        print_error "Download failed"
        exit 1
    fi
    
    # Verify the file exists and has reasonable size
    if [ ! -f "$DEB_FILENAME" ] || [ ! -s "$DEB_FILENAME" ]; then
        print_error "Downloaded file is empty or missing"
        exit 1
    fi
    
    FILE_SIZE=$(du -h "$DEB_FILENAME" | cut -f1)
    print_status "Package size: $FILE_SIZE"
    
    # Install the package
    print_status "Installing AI Screen Helper v$LATEST_VERSION..."
    echo
    
    if [ "$EUID" -eq 0 ]; then
        # Already running as root
        dpkg -i "$DEB_FILENAME" || {
            print_warning "dpkg installation failed, trying to fix dependencies..."
            apt-get update && apt-get install -f -y
        }
    else
        # Use sudo
        sudo dpkg -i "$DEB_FILENAME" || {
            print_warning "dpkg installation failed, trying to fix dependencies..."
            sudo apt-get update && sudo apt-get install -f -y
        }
    fi
    
    # Verify installation
    if dpkg -l | grep -q "^ii.*${PACKAGE_NAME}"; then
        FINAL_VERSION=$(get_installed_version)
        echo
        print_success "AI Screen Helper v$FINAL_VERSION installed successfully!"
        print_status "You can now run: ai-screen-helper"
        print_status "Or use the global hotkey: Ctrl+Shift+G"
        
        # Check if xdotool is installed
        if ! command -v xdotool &> /dev/null; then
            echo
            print_warning "xdotool is not installed - it's required for mouse automation"
            print_status "Install it with: sudo apt install xdotool"
        fi
        
    else
        print_error "Installation verification failed"
        exit 1
    fi
    
    # Cleanup
    cd /
    rm -rf "$TEMP_DIR"
    print_status "Cleanup completed"
    
    echo
    print_success "Installation complete! 🎯"
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Installation cancelled by user${NC}"; rm -rf "$TEMP_DIR" 2>/dev/null; exit 1' INT

# Run main function
main "$@"