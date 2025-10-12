import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Prefix all routes
const PREFIX = '/make-server-c461e4cf';

// ============ AUTH ROUTES ============

// Sign up new admin
app.post(`${PREFIX}/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error creating user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Server error during signup: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// ============ PARTICIPANT ROUTES ============

// Get all participants
app.get(`${PREFIX}/participants`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const participants = await kv.getByPrefix('participant:');
    return c.json({ participants: participants || [] });
  } catch (error) {
    console.log(`Error getting participants: ${error}`);
    return c.json({ error: 'Failed to get participants' }, 500);
  }
});

// Add participant
app.post(`${PREFIX}/participants`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, chances } = await c.req.json();
    
    if (!name || !chances) {
      return c.json({ error: 'Name and chances are required' }, 400);
    }

    const id = crypto.randomUUID();
    const participant = {
      id,
      name,
      chances: parseInt(chances),
      drawn: false,
      createdAt: new Date().toISOString()
    };

    await kv.set(`participant:${id}`, participant);
    return c.json({ success: true, participant });
  } catch (error) {
    console.log(`Error adding participant: ${error}`);
    return c.json({ error: 'Failed to add participant' }, 500);
  }
});

// Update participant
app.put(`${PREFIX}/participants/:id`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { name, chances } = await c.req.json();
    
    const existing = await kv.get(`participant:${id}`);
    if (!existing) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    const updated = {
      ...existing,
      name: name || existing.name,
      chances: chances !== undefined ? parseInt(chances) : existing.chances,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`participant:${id}`, updated);
    return c.json({ success: true, participant: updated });
  } catch (error) {
    console.log(`Error updating participant: ${error}`);
    return c.json({ error: 'Failed to update participant' }, 500);
  }
});

// Delete participant
app.delete(`${PREFIX}/participants/:id`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`participant:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting participant: ${error}`);
    return c.json({ error: 'Failed to delete participant' }, 500);
  }
});

// Reset all drawn statuses
app.post(`${PREFIX}/participants/reset`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const participants = await kv.getByPrefix('participant:');
    
    for (const participant of participants) {
      await kv.set(`participant:${participant.id}`, {
        ...participant,
        drawn: false,
        updatedAt: new Date().toISOString()
      });
    }

    return c.json({ success: true, count: participants.length });
  } catch (error) {
    console.log(`Error resetting participants: ${error}`);
    return c.json({ error: 'Failed to reset participants' }, 500);
  }
});

// ============ PRIZE ROUTES ============

// Get all prizes
app.get(`${PREFIX}/prizes`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const prizes = await kv.getByPrefix('prize:');
    return c.json({ prizes: prizes || [] });
  } catch (error) {
    console.log(`Error getting prizes: ${error}`);
    return c.json({ error: 'Failed to get prizes' }, 500);
  }
});

// Add prize
app.post(`${PREFIX}/prizes`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, weight } = await c.req.json();
    
    if (!name || !weight) {
      return c.json({ error: 'Name and weight are required' }, 400);
    }

    const id = crypto.randomUUID();
    const prize = {
      id,
      name,
      weight: parseInt(weight),
      createdAt: new Date().toISOString()
    };

    await kv.set(`prize:${id}`, prize);
    return c.json({ success: true, prize });
  } catch (error) {
    console.log(`Error adding prize: ${error}`);
    return c.json({ error: 'Failed to add prize' }, 500);
  }
});

// Update prize
app.put(`${PREFIX}/prizes/:id`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const { name, weight } = await c.req.json();
    
    const existing = await kv.get(`prize:${id}`);
    if (!existing) {
      return c.json({ error: 'Prize not found' }, 404);
    }

    const updated = {
      ...existing,
      name: name || existing.name,
      weight: weight !== undefined ? parseInt(weight) : existing.weight,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`prize:${id}`, updated);
    return c.json({ success: true, prize: updated });
  } catch (error) {
    console.log(`Error updating prize: ${error}`);
    return c.json({ error: 'Failed to update prize' }, 500);
  }
});

// Delete prize
app.delete(`${PREFIX}/prizes/:id`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    await kv.del(`prize:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting prize: ${error}`);
    return c.json({ error: 'Failed to delete prize' }, 500);
  }
});

// ============ EVENT ROUTES ============

// Get next participant (not drawn yet)
app.get(`${PREFIX}/event/next-participant`, async (c) => {
  try {
    const participants = await kv.getByPrefix('participant:');
    const notDrawn = participants.filter(p => !p.drawn);
    
    if (notDrawn.length === 0) {
      return c.json({ participant: null });
    }

    // Random selection from not drawn
    const randomIndex = Math.floor(Math.random() * notDrawn.length);
    return c.json({ participant: notDrawn[randomIndex] });
  } catch (error) {
    console.log(`Error getting next participant: ${error}`);
    return c.json({ error: 'Failed to get next participant' }, 500);
  }
});

// Spin the wheel
app.post(`${PREFIX}/event/spin`, async (c) => {
  try {
    const { participantId } = await c.req.json();
    
    if (!participantId) {
      return c.json({ error: 'Participant ID is required' }, 400);
    }

    // Get participant
    const participant = await kv.get(`participant:${participantId}`);
    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Get all prizes
    const prizes = await kv.getByPrefix('prize:');
    if (prizes.length === 0) {
      return c.json({ error: 'No prizes available' }, 400);
    }

    // Weighted random selection
    const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      random -= prize.weight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    return c.json({ prize: selectedPrize });
  } catch (error) {
    console.log(`Error during spin: ${error}`);
    return c.json({ error: 'Failed to spin' }, 500);
  }
});

// Complete participant session (mark as drawn)
app.post(`${PREFIX}/event/complete`, async (c) => {
  try {
    const { participantId, results } = await c.req.json();
    
    if (!participantId) {
      return c.json({ error: 'Participant ID is required' }, 400);
    }

    // Mark participant as drawn
    const participant = await kv.get(`participant:${participantId}`);
    if (participant) {
      await kv.set(`participant:${participantId}`, {
        ...participant,
        drawn: true,
        updatedAt: new Date().toISOString()
      });
    }

    // Save event log
    const logId = crypto.randomUUID();
    const logEntry = {
      id: logId,
      participantId,
      participantName: participant.name,
      results,
      timestamp: new Date().toISOString()
    };

    await kv.set(`log:${logId}`, logEntry);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error completing session: ${error}`);
    return c.json({ error: 'Failed to complete session' }, 500);
  }
});

// Get event logs
app.get(`${PREFIX}/event/logs`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const logs = await kv.getByPrefix('log:');
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ logs: logs || [] });
  } catch (error) {
    console.log(`Error getting logs: ${error}`);
    return c.json({ error: 'Failed to get logs' }, 500);
  }
});

Deno.serve(app.fetch);
