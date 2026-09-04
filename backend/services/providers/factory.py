import logging

from .mock_eta_provider import MockETAProvider
from .mock_network_provider import MockNetworkProvider
from .real_eta_provider import RealETAProvider
from .real_network_provider import RealNetworkProvider
from .interfaces import (
    ETAProvider,
    DelayDNAProvider,
    RecoveryProvider,
    PropagationProvider,
    BottleneckProvider,
    ScenarioProvider,
)

logger = logging.getLogger(__name__)

# Switch these to True when the ML modules are ready to be used
USE_REAL_ETA = False
USE_REAL_NETWORK = False


def get_eta_provider() -> type[ETAProvider] | type[DelayDNAProvider] | type[RecoveryProvider]:
    """Returns the configured ETA-related provider implementation."""
    if USE_REAL_ETA:
        return RealETAProvider()
    return MockETAProvider()


def get_network_provider() -> type[PropagationProvider] | type[BottleneckProvider] | type[ScenarioProvider]:
    """Returns the configured network-related provider implementation."""
    if USE_REAL_NETWORK:
        return RealNetworkProvider()
    return MockNetworkProvider()
