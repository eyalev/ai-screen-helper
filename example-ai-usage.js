#!/usr/bin/env node

/**
 * Example usage script for AI agents using the Screen Helper tool
 * This demonstrates how an AI agent might interact with the grid system
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class AIScreenHelper {
  constructor() {
    this.isOverlayVisible = false;
  }

  async toggleOverlay() {
    console.log('🤖 AI Agent: Activating screen grid overlay...');
    // The actual hotkey is handled by the Electron app
    console.log('📋 Instructions: Press Ctrl+Shift+G to toggle grid overlay');
    console.log('🎯 Then click on a numbered square to zoom in');
    return true;
  }

  async clickAtCoordinates(x, y, description = '') {
    console.log(`🤖 AI Agent: ${description ? description + ' - ' : ''}Clicking at (${x}, ${y})`);
    
    try {
      // Move mouse to coordinates
      await execAsync(`xdotool mousemove ${x} ${y}`);
      console.log(`✅ Mouse moved to (${x}, ${y})`);
      
      // Optional: Add small delay for AI agent to verify position
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Click
      await execAsync(`xdotool click 1`);
      console.log(`✅ Left click executed at (${x}, ${y})`);
      
      return { success: true, x, y };
    } catch (error) {
      console.error(`❌ Failed to click at (${x}, ${y}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getCurrentMousePosition() {
    try {
      const { stdout } = await execAsync('xdotool getmouselocation');
      const match = stdout.match(/x:(\d+) y:(\d+)/);
      if (match) {
        return { x: parseInt(match[1]), y: parseInt(match[2]) };
      }
    } catch (error) {
      console.error('Failed to get mouse position:', error.message);
    }
    return null;
  }

  // Simulate AI agent decision-making process
  async demonstrateAIWorkflow() {
    console.log('🤖 AI Agent Starting Workflow Demo\n');
    
    console.log('Step 1: Get current mouse position');
    const currentPos = await this.getCurrentMousePosition();
    if (currentPos) {
      console.log(`📍 Current position: (${currentPos.x}, ${currentPos.y})\n`);
    }

    console.log('Step 2: Activate screen grid for target identification');
    await this.toggleOverlay();
    console.log('⏳ Waiting for human to interact with grid overlay...\n');

    console.log('Step 3: AI would analyze screen content and determine target');
    console.log('🎯 Example targets an AI might identify:');
    console.log('   - Button with text "Submit"');
    console.log('   - Input field for username');
    console.log('   - Menu item "File > Open"');
    console.log('   - Close button on a dialog\n');

    console.log('Step 4: Use grid system to get precise coordinates');
    console.log('💡 Process:');
    console.log('   1. AI sees grid square #23 contains the target');
    console.log('   2. Grid square #23 opens zoom view');
    console.log('   3. AI identifies exact pixel coordinates in zoom view');
    console.log('   4. Tool outputs: xdotool mousemove 847 412');
    console.log('   5. Tool outputs: xdotool click 1\n');

    console.log('Step 5: Execute precise click (simulated)');
    const exampleCoords = { x: 847, y: 412 };
    await this.clickAtCoordinates(
      exampleCoords.x, 
      exampleCoords.y, 
      'Clicking target button identified in grid'
    );

    console.log('\n✅ AI Agent Workflow Complete!');
    console.log('🔄 The agent can repeat this process for multiple targets');
  }
}

// Run the demonstration
if (require.main === module) {
  const aiAgent = new AIScreenHelper();
  aiAgent.demonstrateAIWorkflow().catch(console.error);
}

module.exports = AIScreenHelper;