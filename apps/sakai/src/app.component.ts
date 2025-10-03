import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthFacadeService } from '@app/services/auth/auth-facade.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {}
