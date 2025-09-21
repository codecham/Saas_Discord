import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { DemoService } from '../../services/demo.service';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss'
})
export class DemoComponent implements OnInit {
  private demoService = inject(DemoService);

  // Exposer les signaux pour le template
  healthStatus = this.demoService.healthStatus;
  databaseInfo = this.demoService.databaseInfo;
  sharedTypesTest = this.demoService.sharedTypesTest;
  loading = this.demoService.loading;
  error = this.demoService.error;

  ngOnInit() {
    this.demoService.runAllTests();
  }

  testEndpoint(endpoint: 'health' | 'database' | 'shared-types') {
    this.demoService.testEndpoint(endpoint);
  }

  runAllTests() {
    this.demoService.runAllTests();
  }
}