import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { TestService } from './services/test.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  // private testService = inject(TestService);
  
  // title = 'frontend';
  
  // // Exposer les signaux pour le template
  // testData = this.testService.testData;
  // loading = this.testService.loading;
  // error = this.testService.error;

  // ngOnInit() {
  //   this.testService.loadTest();
  // }
  title = 'frontend';
  // private authFacade = inject(AuthFacadeService);

  async ngOnInit() {
    // await this.authFacade.initialize();

  }
}
