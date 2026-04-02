import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KeyboardDriver } from '../../hardware/keyboard';
import { bluetoothManager } from '../../hardware/index';

@Component({
  selector: 'app-keyboard-mapping',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './keyboard-mapping.html',
  styleUrls: ['./keyboard-mapping.scss']
})
export class KeyboardMappingComponent implements OnInit {
  mapping: { action: string; key: string }[] = [];
  
  // The standard actions we want to map
  readonly actions = [
    "U", "U'", "D", "D'", "R", "R'", "L", "L'", "F", "F'", "B", "B'"
  ];

  ngOnInit() {
    this.loadMapping();
  }

  loadMapping() {
    const currentMap = KeyboardDriver.getMapping();
    
    // Convert object to array for easier editing
    this.mapping = this.actions.map(action => {
      // Find the key for this action
      const keyEntry = Object.entries(currentMap).find(([_, val]) => val === action);
      return {
        action: action,
        key: keyEntry ? keyEntry[0] : ''
      };
    });
  }

  saveMapping() {
    const newMap: Record<string, string> = {};
    for (const item of this.mapping) {
      if (item.key && item.key.trim() !== '') {
        // Handle lowercase for consistency
        newMap[item.key.trim().toLowerCase()] = item.action;
      }
    }
    
    KeyboardDriver.saveMapping(newMap);
    
    // If we are currently connected to the keyboard simulator, update it immediately
    if (bluetoothManager.driver instanceof KeyboardDriver) {
      bluetoothManager.driver.reloadMapping();
    }
  }

  resetToDefault() {
    KeyboardDriver.saveMapping(KeyboardDriver.DEFAULT_MAPPING);
    this.loadMapping();
    
    if (bluetoothManager.driver instanceof KeyboardDriver) {
      bluetoothManager.driver.reloadMapping();
    }
  }
  
  onKeydown(event: KeyboardEvent, index: number) {
    // Prevent default scrolling etc if we are recording a key
    event.preventDefault();
    
    // Ignore modifier keys alone
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
      return;
    }
    
    this.mapping[index].key = event.key.toLowerCase();
    this.saveMapping(); // Auto-save on change
  }
}
